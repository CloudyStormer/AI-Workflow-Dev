"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Icon } from "@phosphor-icons/react";
import {
  Bell,
  CaretDown,
  ChartPolar,
  DownloadSimple,
  Flask,
  FolderOpen,
  List,
  MagnifyingGlass,
  RocketLaunch,
  ShieldCheck,
  SquaresFour,
  UsersThree,
  X,
} from "@phosphor-icons/react";
import {
  DATA_SOURCE_OPTIONS,
  DEFAULT_FILTERS,
  ITERATION_OPTIONS,
  NAV_ITEMS,
  PROJECTS,
  TIME_RANGE_OPTIONS,
  type DashboardFilters,
  type ViewId,
} from "./dashboard-data";
import {
  describeFilters,
  getDashboardExportScope,
  parseDashboardFilters,
  writeDashboardFilters,
} from "./dashboard-filtering";
import { SearchResults } from "./dashboard-search";
import type { DrawerPayload } from "./dashboard-view-shared";
import { ViewContent } from "./dashboard-views";

const NAV_ICONS: Record<ViewId, Icon> = {
  overview: SquaresFour,
  projects: FolderOpen,
  roles: UsersThree,
  quality: ShieldCheck,
  releases: RocketLaunch,
  governance: ChartPolar,
};

const MOBILE_PRIMARY_NAV: ViewId[] = ["overview", "projects", "quality"];
const MOBILE_MORE_NAV: ViewId[] = ["roles", "releases", "governance"];

export default function Dashboard() {
  const [view, setView] = useState<ViewId>("overview");
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_FILTERS);
  const [searchQuery, setSearchQuery] = useState("");
  const [drawer, setDrawer] = useState<DrawerPayload | null>(null);
  const [toast, setToast] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const drawerRef = useRef<HTMLDialogElement>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);
  const moreRef = useRef<HTMLDialogElement>(null);
  const moreCloseRef = useRef<HTMLButtonElement>(null);
  const lastFocusRef = useRef<HTMLElement | null>(null);
  const pageTitleRef = useRef<HTMLHeadingElement>(null);
  const toastTimerRef = useRef<number | null>(null);

  const currentNav = NAV_ITEMS.find((item) => item.id === view) ?? NAV_ITEMS[0];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedView = params.get("view") as ViewId | null;
    const frame = window.requestAnimationFrame(() => {
      if (requestedView && NAV_ITEMS.some((item) => item.id === requestedView)) setView(requestedView);
      setFilters(parseDashboardFilters(params));
      setHydrated(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const params = new URLSearchParams(window.location.search);
    params.set("view", view);
    writeDashboardFilters(params, filters);
    window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
  }, [filters, hydrated, view]);

  useEffect(() => {
    const dialog = drawerRef.current;
    if (!dialog) return;
    if (drawer && !dialog.open) {
      dialog.showModal();
      window.requestAnimationFrame(() => drawerCloseRef.current?.focus({ preventScroll: true }));
    }
    if (!drawer && dialog.open) dialog.close();
  }, [drawer]);

  useEffect(() => {
    const dialog = moreRef.current;
    if (!dialog) return;
    if (moreOpen && !dialog.open) {
      dialog.showModal();
      window.requestAnimationFrame(() => moreCloseRef.current?.focus({ preventScroll: true }));
    }
    if (!moreOpen && dialog.open) dialog.close();
  }, [moreOpen]);

  useEffect(() => () => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
  }, []);

  function showNotice(message: string) {
    setToast(message);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(""), 3600);
  }

  function navigate(nextView: ViewId) {
    setView(nextView);
    setMoreOpen(false);
    window.requestAnimationFrame(() => pageTitleRef.current?.focus({ preventScroll: true }));
    window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }

  function openDrawer(payload: DrawerPayload) {
    lastFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setDrawer(payload);
  }

  function closeDrawer() {
    drawerRef.current?.close();
    setDrawer(null);
    window.requestAnimationFrame(() => lastFocusRef.current?.focus({ preventScroll: true }));
  }

  function closeMore() {
    moreRef.current?.close();
    setMoreOpen(false);
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = searchQuery.trim();
    if (!normalized) {
      showNotice("请输入项目、角色或缺陷关键词");
      return;
    }
    openDrawer({
      eyebrow: "全局搜索 · 演示数据",
      title: `“${normalized}”的搜索结果`,
      content: <SearchResults query={normalized} filters={filters} onActivate={(item) => {
        if (item.projectId) {
          setFilters((current) => ({ ...current, project: item.projectId! }));
        }
        closeDrawer();
        navigate(item.view);
      }} />,
    });
  }

  function exportDemoReport() {
    const scope = getDashboardExportScope(view, filters);
    if (!scope.available) {
      showNotice(`当前筛选覆盖不可用，未导出演示报告：${scope.title}`);
      return;
    }

    const report = {
      title: "AI Workflow Control Center 演示报告",
      warning: "演示数据 · 非实时 · 不应用于业务决策",
      generatedAt: new Date().toISOString(),
      filters,
      currentView: view,
      coverage: "当前筛选内可用的演示快照",
      projects: scope.projects.map(({ id, name, kind, stage, progress, risk, openIssues, nextApproval }) => ({ id, name, kind, stage, progress, risk, openIssues, nextApproval })),
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "ai-workflow-control-center-demo-report.json";
    anchor.click();
    URL.revokeObjectURL(url);
    showNotice("演示报告已导出；文件不包含实时数据或账号信息");
  }

  return (
    <div className={`control-shell ${sidebarCollapsed ? "sidebar-is-collapsed" : ""}`}>
      <aside className="sidebar" aria-label="桌面导航">
        <div className="brand-block">
          <Image src="/favicon.svg" alt="" aria-hidden="true" width={44} height={44} priority />
          <div><strong>AI Workflow</strong><span>Control Center</span></div>
        </div>

        <div className="lab-mode">
          <Flask aria-hidden="true" weight="fill" />
          <div><strong>实验室模式</strong><span>方法治理 · 样本验证</span></div>
        </div>

        <nav className="side-nav" aria-label="主导航">
          <span className="nav-section-label">控制中心</span>
          {NAV_ITEMS.map((item) => {
            const NavIcon = NAV_ICONS[item.id];
            return (
              <button
                type="button"
                key={item.id}
                data-nav-view={item.id}
                className={view === item.id ? "active" : ""}
                aria-current={view === item.id ? "page" : undefined}
                title={sidebarCollapsed ? item.label : undefined}
                onClick={() => navigate(item.id)}
              >
                <NavIcon aria-hidden="true" weight={view === item.id ? "fill" : "regular"} />
                <span><strong>{item.label}</strong><small>{item.description}</small></span>
                {item.id === "quality" && <b aria-label="5 项开放缺陷">5</b>}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-user">
          <span className="owner-avatar" aria-hidden="true">超</span>
          <div><strong>超级无敌帅超超总</strong><small>项目所有者</small></div>
          <button type="button" aria-label="通知，演示状态" onClick={() => showNotice("通知中心为演示状态，真实消息尚未接入")}><Bell aria-hidden="true" /></button>
        </div>

        <button type="button" className="collapse-sidebar" onClick={() => setSidebarCollapsed((value) => !value)} aria-label={sidebarCollapsed ? "展开侧边栏" : "收起侧边栏"}>
          <List aria-hidden="true" />
          <span>{sidebarCollapsed ? "展开" : "收起菜单"}</span>
        </button>
      </aside>

      <main className="main-content" id="main-content">
        <header className="page-header">
          <div className="mobile-brand">
            <Image src="/favicon.svg" alt="" aria-hidden="true" width={36} height={36} />
            <div><strong>AI Workflow</strong><span>Control Center</span></div>
          </div>
          <div className="page-heading">
            <span>AI 工作流实验与验证平台</span>
            <h1 id="page-title" ref={pageTitleRef} tabIndex={-1}>{currentNav.label}</h1>
            <p>{currentNav.description}</p>
          </div>
          <div className="header-status">
            <span><DatabaseIcon />演示数据</span>
            <small>演示快照 · 2026-08-04 16:41</small>
          </div>
        </header>

        <div className="demo-banner" role="status">
          <Flask aria-hidden="true" weight="fill" />
          <strong>演示数据 · 非实时 · 待接入真实工作流状态源</strong>
          <span>当前页面中的数字、状态和操作仅用于验证界面，不应用于业务决策。</span>
        </div>

        <section className="global-toolbar" aria-label="全局筛选工具栏">
          <label className="toolbar-select"><span>项目范围</span><select data-filter="project" value={filters.project} onChange={(event) => setFilters((current) => ({ ...current, project: event.target.value as DashboardFilters["project"] }))}><option value="all">全部项目</option>{PROJECTS.map((project) => <option value={project.id} key={project.id}>{project.name}</option>)}</select><CaretDown aria-hidden="true" /></label>
          <label className="toolbar-select"><span>时间范围</span><select data-filter="range" value={filters.range} onChange={(event) => setFilters((current) => ({ ...current, range: event.target.value as DashboardFilters["range"] }))}>{TIME_RANGE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><CaretDown aria-hidden="true" /></label>
          <label className="toolbar-select"><span>当前迭代</span><select data-filter="iteration" value={filters.iteration} onChange={(event) => setFilters((current) => ({ ...current, iteration: event.target.value as DashboardFilters["iteration"] }))}>{ITERATION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><CaretDown aria-hidden="true" /></label>
          <label className="toolbar-select"><span>数据来源</span><select data-filter="source" value={filters.source} onChange={(event) => setFilters((current) => ({ ...current, source: event.target.value as DashboardFilters["source"] }))}>{DATA_SOURCE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><CaretDown aria-hidden="true" /></label>
          <form className="global-search" role="search" onSubmit={handleSearch}>
            <MagnifyingGlass aria-hidden="true" />
            <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} aria-label="全局搜索" placeholder="搜索项目、角色或缺陷" />
            <button type="submit">搜索</button>
          </form>
          <button type="button" className="export-button" data-export-report onClick={exportDemoReport}><DownloadSimple aria-hidden="true" />导出演示报告</button>
        </section>

        <div className="filter-scope-status" role="status" aria-live="polite" data-filter-summary>
          <span>当前筛选</span>
          <strong>{describeFilters(filters)}</strong>
          <small>只有已登记维度参与筛选；覆盖不足时停止显示未过滤数值。</small>
          <button type="button" data-reset-filters onClick={() => setFilters(DEFAULT_FILTERS)}>恢复默认筛选</button>
        </div>

        {hydrated
          ? <ViewContent view={view} filters={filters} openDrawer={openDrawer} />
          : <div className="view-loading" role="status">正在恢复页面与筛选条件…</div>}

        <footer className="page-footer">
          <span>AI Workflow Control Center · 浏览器可见中文前端</span>
          <span>数据状态：演示 / 待接入 · 当前批次不连接 API、数据库或生产环境</span>
        </footer>
      </main>

      <nav className="mobile-bottom-nav" aria-label="移动端主导航">
        {MOBILE_PRIMARY_NAV.map((id) => {
          const item = NAV_ITEMS.find((nav) => nav.id === id)!;
          const NavIcon = NAV_ICONS[id];
          return <button type="button" key={id} data-mobile-nav-view={id} className={view === id ? "active" : ""} aria-current={view === id ? "page" : undefined} onClick={() => navigate(id)}><NavIcon aria-hidden="true" weight={view === id ? "fill" : "regular"} /><span>{item.shortLabel}</span></button>;
        })}
        <button type="button" className={MOBILE_MORE_NAV.includes(view) ? "active" : ""} onClick={() => setMoreOpen(true)}><List aria-hidden="true" /><span>更多</span></button>
      </nav>

      <dialog
        ref={drawerRef}
        className="detail-drawer"
        aria-labelledby="drawer-title"
        onCancel={(event) => { event.preventDefault(); closeDrawer(); }}
        onClose={() => setDrawer(null)}
      >
        <div className="drawer-header">
          <div><span>{drawer?.eyebrow}</span><h2 id="drawer-title">{drawer?.title}</h2></div>
          <button ref={drawerCloseRef} type="button" onClick={closeDrawer} aria-label="关闭详情"><X aria-hidden="true" /></button>
        </div>
        <div className="drawer-body">{drawer?.content}</div>
        <div className="drawer-footer"><span>演示数据 · 非实时</span><button type="button" onClick={closeDrawer}>关闭</button></div>
      </dialog>

      <dialog
        ref={moreRef}
        className="mobile-more-sheet"
        aria-labelledby="more-title"
        onCancel={(event) => { event.preventDefault(); closeMore(); }}
        onClose={() => setMoreOpen(false)}
      >
        <div className="more-sheet-header"><h2 id="more-title">更多页面</h2><button ref={moreCloseRef} type="button" onClick={closeMore} aria-label="关闭更多页面"><X aria-hidden="true" /></button></div>
        <div className="more-sheet-list">
          {MOBILE_MORE_NAV.map((id) => {
            const item = NAV_ITEMS.find((nav) => nav.id === id)!;
            const NavIcon = NAV_ICONS[id];
            return <button type="button" key={id} className={view === id ? "active" : ""} onClick={() => navigate(id)}><NavIcon aria-hidden="true" /><span><strong>{item.label}</strong><small>{item.description}</small></span></button>;
          })}
        </div>
      </dialog>

      {toast && <div className="toast" role="status" aria-live="polite">{toast}</div>}
    </div>
  );
}

function DatabaseIcon() {
  return <Flask aria-hidden="true" weight="fill" />;
}
