import './ViewportGrid.css';
import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import OHIF, { utils } from '@ohif/core';
import { useSnackbarContext, useLogger } from '@ohif/ui';
//
import ViewportPane from './ViewportPane.js';
import DefaultViewport from './DefaultViewport.js';
import EmptyViewport from './EmptyViewport.js';
import cornerstoneTools from 'cornerstone-tools';
import { displayReferenceLines } from '../../connectedComponents/displayReferenceLines';
import cornerstone from 'cornerstone-core';

const { loadAndCacheDerivedDisplaySets } = utils;

const ViewportGrid = function(props) {
  const {
    activeViewportIndex,
    availablePlugins,
    defaultPlugin: defaultPluginName,
    layout,
    numRows,
    numColumns,
    setViewportData,
    studies,
    viewportData,
    children,
    isStudyLoaded,
  } = props;

  const rowSize = 100 / numRows;
  const colSize = 100 / numColumns;

  // http://grid.malven.co/
  if (!viewportData || !viewportData.length) {
    return null;
  }

  const snackbar = useSnackbarContext();
  const logger = useLogger();

  useEffect(() => {
    if (isStudyLoaded) {
      viewportData.forEach(displaySet => {
        loadAndCacheDerivedDisplaySets(displaySet, studies, logger, snackbar);
      });
      /*if (studies[0] && !studies[0].synchronizer) {
        studies[0].synchronizer = true;*/
      console.log('**------------------------', studies[0].displaySets);
      const selectedSOPInstanceUID = viewportData[0].SOPInstanceUID;
      let imageIds = [];
      studies[0].displaySets.forEach(item => {
        if(item.SOPInstanceUID===selectedSOPInstanceUID && item.SOPInstanceUID!==undefined) {
          console.log('---->>>>>>>>', item.images);
          item.images.forEach(img => {
            imageIds.push(img._data.imageRendering+':'+img._data.baseWadoRsUri);
          });
        }
      })
      if (studies[0]) {

        //
        const $viewports = document.getElementsByClassName('viewport-container')[activeViewportIndex];
        if ($viewports.querySelector('canvas')) {
          // Cornerstone Tools compare DOM elements (check getEnabledElement cornerstone function)
          // so we can't pass a jQuery object as an argument, otherwise it throws an excepetion
          let domElement = $viewports.querySelector('.viewport-element');//.querySelector('canvas');
          setTimeout(() => {
            //cornerstone.enable(domElement);
            //OHIF.viewer.synchronizer.add(domElement);
            displayReferenceLines(domElement);

            /*cornerstone.enable(domElement);
            loadSeries(domElement,
              {
                StudyInstanceUID: viewportData[0].StudyInstanceUID,
                displaySetInstanceUID: viewportData[0].displaySetInstanceUID,
                frameRate: viewportData[0].frameRate,
                imageIds: imageIds,
                isClip: viewportData[0].isClip,
                currentImageIdIndex: 0,
              });

             */
            //cornerstoneTools.addTool(cornerstoneTools.ReferenceLinesTool);
            cornerstoneTools.setToolEnabled('ReferenceLines', {
              synchronizationContext: OHIF.viewer.synchronizer,
            });
            // @TODO Add this to OHIFAfterActivateViewport handler...
            //const synchronizer = OHIF.viewer.stackImagePositionOffsetSynchronizer;
            console.log('check synchronizer', OHIF.viewer.synchronizer);
            /*if (!synchronizer) return;

            synchronizer.update();*/
          }, 2000);

        }
        //const firstElement = document.getElementsByClassName('cornerstone-canvas')[0];
        /*const firstElement = $viewports.querySelector('.viewport-element');
        synchronizer.add(cornerstone.getEnabledElement(firstElement));
        const firstStack = {
            currentImageIdIndex: 0,
            imageIds: studies[0].series,
          };
        cornerstoneTools.addStackStateManager(firstStack, ['stack', 'Crosshairs']);
        cornerstoneTools.addToolState(firstElement, 'stack', firstStack);*/
      }
      console.log('1 MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM', studies);
      console.log('2 MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM', viewportData);
    }
  }, [studies, viewportData, isStudyLoaded, snackbar]);

  const loadSeries = (element, stack) => {
    OHIF.viewer.synchronizer.add(element);

    cornerstoneTools.addStackStateManager(element, ['stack', 'ReferenceLines']);
    cornerstoneTools.addToolState(element, 'stack', stack);
  };

  const getViewportPanes = () =>
    layout.viewports.map((layout, viewportIndex) => {
      const displaySet = viewportData[viewportIndex];

      if (!displaySet) {
        return null;
      }

      const data = {
        displaySet,
        studies,
      };

      // JAMES TODO:

      // Use whichever plugin is currently in use in the panel
      // unless nothing is specified. If nothing is specified
      // and the display set has a plugin specified, use that.
      //
      // TODO: Change this logic to:
      // - Plugins define how capable they are of displaying a SopClass
      // - When updating a panel, ensure that the currently enabled plugin
      // in the viewport is capable of rendering this display set. If not
      // then use the most capable available plugin

      const pluginName =
        !layout.plugin && displaySet && displaySet.plugin
          ? displaySet.plugin
          : layout.plugin;

      const ViewportComponent = _getViewportComponent(
        data, // Why do we pass this as `ViewportData`, when that's not really what it is?
        viewportIndex,
        children,
        availablePlugins,
        pluginName,
        defaultPluginName
      );

      return (
        <ViewportPane
          onDrop={setViewportData}
          viewportIndex={viewportIndex} // Needed by `setViewportData`
          className={classNames('viewport-container', {
            active: activeViewportIndex === viewportIndex,
          })}
          key={viewportIndex}
        >
          {ViewportComponent}
        </ViewportPane>
      );
    });

  const ViewportPanes = React.useMemo(getViewportPanes, [
    layout,
    viewportData,
    studies,
    children,
    availablePlugins,
    defaultPluginName,
    setViewportData,
    activeViewportIndex,
  ]);

  return (
    <div
      data-cy="viewprt-grid"
      style={{
        display: 'grid',
        gridTemplateRows: `repeat(${numRows}, ${rowSize}%)`,
        gridTemplateColumns: `repeat(${numColumns}, ${colSize}%)`,
        height: '100%',
        width: '100%',
      }}
    >
      {ViewportPanes}
    </div>
  );
};

ViewportGrid.propTypes = {
  viewportData: PropTypes.array.isRequired,
  supportsDrop: PropTypes.bool.isRequired,
  activeViewportIndex: PropTypes.number.isRequired,
  layout: PropTypes.object.isRequired,
  availablePlugins: PropTypes.object.isRequired,
  setViewportData: PropTypes.func.isRequired,
  studies: PropTypes.array,
  children: PropTypes.node,
  defaultPlugin: PropTypes.string,
  numRows: PropTypes.number.isRequired,
  numColumns: PropTypes.number.isRequired,
};

ViewportGrid.defaultProps = {
  viewportData: [],
  numRows: 1,
  numColumns: 1,
  layout: {
    viewports: [{}],
  },
  activeViewportIndex: 0,
  supportsDrop: true,
  availablePlugins: {
    DefaultViewport,
  },
  defaultPlugin: 'defaultViewportPlugin',
};

/**
 *
 *
 * @param {*} plugin
 * @param {*} viewportData
 * @param {*} viewportIndex
 * @param {*} children
 * @returns
 */
function _getViewportComponent(
  viewportData,
  viewportIndex,
  children,
  availablePlugins,
  pluginName,
  defaultPluginName
) {
  if (viewportData.displaySet) {
    pluginName = pluginName || defaultPluginName;
    const ViewportComponent = availablePlugins[pluginName];

    if (!ViewportComponent) {
      throw new Error(
        `No Viewport Component available for name ${pluginName}.
         Available plugins: ${JSON.stringify(availablePlugins)}`
      );
    }

    return (
      <ViewportComponent
        viewportData={viewportData}
        viewportIndex={viewportIndex}
        children={[children]}
      />
    );
  }

  return <EmptyViewport />;
}

export default ViewportGrid;
