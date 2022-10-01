import { createSelector } from 'reselect';

const getActiveViewportIndex = state => state.viewports.activeViewportIndex;
const getLayoutViewports = state => state.viewports.layout.viewports;
const getViewportSpecificData = state => state.viewports.viewportSpecificData;

/**
 * Think of this as a computed getter for our store. It lets us watch parts of
 * our redux state, and only update/recalculate when those values change.
 */
export const getActiveContexts = createSelector(
  [getActiveViewportIndex, getLayoutViewports, getViewportSpecificData],
  (activeViewportIndex, layoutViewports, viewportSpecificData) => {
    const activeContexts = ['VIEWER'];
    const activeLayoutViewport = layoutViewports[activeViewportIndex] || {};
    const activeViewportSpecificData =
      viewportSpecificData[activeViewportIndex] || {};
    const activeViewportPluginName =
      activeLayoutViewport.plugin || activeViewportSpecificData.plugin;

    if (activeViewportPluginName) {
      const activeViewportExtension = `ACTIVE_VIEWPORT::${activeViewportPluginName.toUpperCase()}`;
      activeContexts.push(activeViewportExtension);
    }
    if (layoutViewports.length === 4) {
      activeContexts.push('ACTIVE_VIEWPORT::FOUR');
    }

    return activeContexts;
  }
);
