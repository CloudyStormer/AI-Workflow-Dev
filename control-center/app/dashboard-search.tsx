import { ArrowRight, FileText, MagnifyingGlass } from "@phosphor-icons/react";
import { useMemo } from "react";
import type { DashboardFilters } from "./dashboard-data";
import { getDashboardSearchItems, type DashboardSearchItem } from "./dashboard-filtering";

export function SearchResults({
  query,
  filters,
  onActivate,
}: {
  query: string;
  filters: DashboardFilters;
  onActivate: (item: DashboardSearchItem) => void;
}) {
  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    const items = getDashboardSearchItems(filters);
    return items.filter((item) => item.label.toLowerCase().includes(normalized)).slice(0, 8);
  }, [filters, query]);

  return (
    <div className="search-results" data-search-results>
      {results.length
        ? results.map((item) => <button type="button" data-search-result={item.id} data-search-project-id={item.projectId} key={item.id} onClick={() => onActivate(item)}><MagnifyingGlass aria-hidden="true" /><span><strong>{item.label}</strong><small>{item.type} · 当前筛选内演示数据</small></span><ArrowRight aria-hidden="true" /></button>)
        : <div className="empty-result" data-search-empty><FileText aria-hidden="true" /><strong>当前筛选内没有匹配结果</strong><p>请调整全局筛选，或尝试当前范围内的项目、角色与缺陷关键词。</p></div>}
    </div>
  );
}
