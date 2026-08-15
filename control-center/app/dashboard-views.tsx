"use client";

import {
  Component,
  Suspense,
  lazy,
  type ComponentType,
  type LazyExoticComponent,
  type ReactNode,
} from "react";
import { getViewFilterAvailability } from "./dashboard-filtering";
import { FilterUnavailableState, type ViewProps } from "./dashboard-view-shared";
import type { ViewId } from "./dashboard-data";

const VIEW_COMPONENTS: Record<ViewId, LazyExoticComponent<ComponentType<ViewProps>>> = {
  overview: lazy(() => import("./views/overview-view")),
  projects: lazy(() => import("./views/projects-view")),
  roles: lazy(() => import("./views/roles-view")),
  quality: lazy(() => import("./views/quality-view")),
  releases: lazy(() => import("./views/releases-view")),
  governance: lazy(() => import("./views/governance-view")),
};

class ViewLoadBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <section className="filter-unavailable" role="alert">
          <div>
            <span>页面模块加载失败</span>
            <h2>当前视图暂时无法显示</h2>
            <p>请刷新页面重试；演示数据和真实工作流记录均未被修改。</p>
          </div>
        </section>
      );
    }
    return this.props.children;
  }
}

export function ViewContent({ view, ...props }: ViewProps & { view: ViewId }) {
  const availability = getViewFilterAvailability(view, props.filters);
  if (!availability.available) {
    return <FilterUnavailableState title={availability.title ?? "当前筛选没有可用覆盖"} detail={availability.detail ?? "请调整筛选后重试。"} />;
  }

  const ActiveView = VIEW_COMPONENTS[view];
  return (
    <ViewLoadBoundary key={view}>
      <Suspense fallback={<div className="view-loading" role="status">正在载入{view === "overview" ? "总览" : "当前"}视图…</div>}>
        <ActiveView {...props} />
      </Suspense>
    </ViewLoadBoundary>
  );
}
