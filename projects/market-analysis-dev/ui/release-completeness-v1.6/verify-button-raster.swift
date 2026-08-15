import AppKit
import Foundation

struct Rectangle: Decodable {
    let x: Double
    let y: Double
    let width: Double
    let height: Double
}

struct ButtonEntry: Decodable {
    let asset: String
    let button_id: String
    let container_id: String
    let png_path: String
    let rect: Rectangle
    let background_hex: String
    let foreground_hex: String
    let label: String
    let expected_raster_center_tolerance_px: Double
}

struct Contract: Decodable {
    let entries: [ButtonEntry]
}

struct ButtonResult: Encodable {
    let asset: String
    let button_id: String
    let label: String
    let glyph_bounds: [String: Double]
    let button_center_y: Double
    let glyph_center_y: Double
    let center_delta_y: Double
    let tolerance_px: Double
    let foreground_pixels: Int
    let status: String
}

func fail(_ message: String) -> Never {
    FileHandle.standardError.write(Data((message + "\n").utf8))
    exit(1)
}

func rgb(_ hex: String) -> (Double, Double, Double) {
    let clean = hex.replacingOccurrences(of: "#", with: "")
    guard clean.count == 6, let value = Int(clean, radix: 16) else { fail("颜色格式错误：\(hex)") }
    return (Double((value >> 16) & 255), Double((value >> 8) & 255), Double(value & 255))
}

func distance(_ a: (Double, Double, Double), _ b: (Double, Double, Double)) -> Double {
    let dr = a.0 - b.0, dg = a.1 - b.1, db = a.2 - b.2
    return sqrt(dr * dr + dg * dg + db * db)
}

guard CommandLine.arguments.count == 2 else { fail("用法：swift verify-button-raster.swift button-raster-contract.json") }
let contractURL = URL(fileURLWithPath: CommandLine.arguments[1]).standardizedFileURL
let root = contractURL.deletingLastPathComponent()
let contract = try JSONDecoder().decode(Contract.self, from: Data(contentsOf: contractURL))
var results: [ButtonResult] = []

for entry in contract.entries {
    let pngURL = root.appendingPathComponent(entry.png_path).standardizedFileURL
    let data = try Data(contentsOf: pngURL)
    guard let bitmap = NSBitmapImageRep(data: data) else { fail("无法读取 PNG：\(pngURL.path)") }
    let foreground = rgb(entry.foreground_hex)
    let background = rgb(entry.background_hex)
    let inset = 7
    let minX = max(0, Int(entry.rect.x.rounded(.down)) + inset)
    let maxX = min(bitmap.pixelsWide - 1, Int((entry.rect.x + entry.rect.width).rounded(.up)) - inset - 1)
    let minY = max(0, Int(entry.rect.y.rounded(.down)) + inset)
    let maxY = min(bitmap.pixelsHigh - 1, Int((entry.rect.y + entry.rect.height).rounded(.up)) - inset - 1)
    var pixelMinX = Int.max, pixelMaxX = Int.min, pixelMinY = Int.max, pixelMaxY = Int.min, count = 0

    for y in minY...maxY {
        for x in minX...maxX {
            guard let converted = bitmap.colorAt(x: x, y: y)?.usingColorSpace(.deviceRGB) else { continue }
            let pixel = (Double(converted.redComponent * 255), Double(converted.greenComponent * 255), Double(converted.blueComponent * 255))
            if distance(pixel, foreground) <= 80 && distance(pixel, background) >= 45 && converted.alphaComponent >= 0.5 {
                pixelMinX = min(pixelMinX, x); pixelMaxX = max(pixelMaxX, x)
                pixelMinY = min(pixelMinY, y); pixelMaxY = max(pixelMaxY, y)
                count += 1
            }
        }
    }

    guard count >= 12 else { fail("\(entry.asset)/\(entry.button_id)：未识别到足够的按钮文字像素（\(count)）") }
    let glyphCenter = (Double(pixelMinY) + Double(pixelMaxY)) / 2
    let buttonCenter = entry.rect.y + entry.rect.height / 2
    let delta = glyphCenter - buttonCenter
    guard abs(delta) <= entry.expected_raster_center_tolerance_px else {
        fail("\(entry.asset)/\(entry.button_id)：真实 PNG 字形中心偏移 \(delta)px，超过 ±\(entry.expected_raster_center_tolerance_px)px")
    }
    results.append(ButtonResult(
        asset: entry.asset,
        button_id: entry.button_id,
        label: entry.label,
        glyph_bounds: ["x": Double(pixelMinX), "y": Double(pixelMinY), "width": Double(pixelMaxX - pixelMinX + 1), "height": Double(pixelMaxY - pixelMinY + 1)],
        button_center_y: buttonCenter,
        glyph_center_y: glyphCenter,
        center_delta_y: delta,
        tolerance_px: entry.expected_raster_center_tolerance_px,
        foreground_pixels: count,
        status: "passed"
    ))
}

let report: [String: Any] = [
    "schema_version": 1,
    "method": "rendered-png-glyph-pixel-bounds-via-coregraphics",
    "status": "machine_passed",
    "button_count": results.count,
    "coordinate_system": "PNG top-left pixel coordinates",
    "scope": "button-label-glyph-pixels-only",
    "does_not_claim": "general SVG text bounds, browser CSS layout, or independent visual approval",
    "results": try JSONSerialization.jsonObject(with: JSONEncoder().encode(results))
]
let output = try JSONSerialization.data(withJSONObject: report, options: [.prettyPrinted, .sortedKeys])
FileHandle.standardOutput.write(output)
FileHandle.standardOutput.write(Data("\n".utf8))
