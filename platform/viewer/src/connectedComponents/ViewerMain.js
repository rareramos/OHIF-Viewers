import './ViewerMain.css';
import { servicesManager } from './../App.js';
import { Component } from 'react';
import { ConnectedViewportGrid } from './../components/ViewportGrid/index.js';
import PropTypes from 'prop-types';
import React from 'react';
import memoize from 'lodash/memoize';
import _values from 'lodash/values';
import cornerstone from 'cornerstone-core';
import cornerstoneTools from 'cornerstone-tools';
import StackManager from '@ohif/core/src/utils/StackManager';
import _ from 'lodash';
import OHIF from '@ohif/core';

var values = memoize(_values);
let delaySetReferenceLines = 0;
let firstDisplaySetInstanceUID = '';
let secondDisplaySetInstanceUID = '';
let instanceUIDs = [];

class ViewerMain extends Component {
  static propTypes = {
    activeViewportIndex: PropTypes.number.isRequired,
    studies: PropTypes.array,
    viewportSpecificData: PropTypes.object.isRequired,
    layout: PropTypes.object.isRequired,
    setViewportSpecificData: PropTypes.func.isRequired,
    clearViewportSpecificData: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);

    this.state = {
      displaySets: [],
    };
  }

  getDisplaySets(studies) {
    const displaySets = [];
    studies.forEach(study => {
      study.displaySets.forEach(dSet => {
        if (!dSet.plugin) {
          dSet.plugin = 'cornerstone';
        }
        displaySets.push(dSet);
      });
    });

    return displaySets;
  }

  findDisplaySet(studies, StudyInstanceUID, displaySetInstanceUID) {
    const study = studies.find(study => {
      return study.StudyInstanceUID === StudyInstanceUID;
    });

    if (!study) {
      return;
    }

    return study.displaySets.find(displaySet => {
      return displaySet.displaySetInstanceUID === displaySetInstanceUID;
    });
  }

  componentDidMount() {
    // Add beforeUnload event handler to check for unsaved changes
    //window.addEventListener('beforeunload', unloadHandlers.beforeUnload);

    // Get all the display sets for the viewer studies
    if (this.props.studies) {
      const displaySets = this.getDisplaySets(this.props.studies);
      this.setState({ displaySets }, this.fillEmptyViewportPanes);
    }
  }

  componentDidUpdate(prevProps) {
    const prevViewportAmount = prevProps.layout.viewports.length;
    const viewportAmount = this.props.layout.viewports.length;
    const isVtk = this.props.layout.viewports.some(vp => !!vp.vtk);

    if (
      this.props.studies !== prevProps.studies ||
      (viewportAmount !== prevViewportAmount && !isVtk)
    ) {
      const displaySets = this.getDisplaySets(this.props.studies);
      this.setState({ displaySets }, this.fillEmptyViewportPanes);
    }
  }

  fillEmptyViewportPanes = () => {
    // TODO: Here is the entry point for filling viewports on load.
    const dirtyViewportPanes = [];
    const { layout, viewportSpecificData } = this.props;
    const { displaySets } = this.state;

    if (!displaySets || !displaySets.length) {
      return;
    }

    for (let i = 0; i < layout.viewports.length; i++) {
      const viewportPane = viewportSpecificData[i];
      const isNonEmptyViewport =
        viewportPane &&
        viewportPane.StudyInstanceUID &&
        viewportPane.displaySetInstanceUID;

      if (isNonEmptyViewport) {
        dirtyViewportPanes.push({
          StudyInstanceUID: viewportPane.StudyInstanceUID,
          displaySetInstanceUID: viewportPane.displaySetInstanceUID,
        });

        continue;
      }

      const foundDisplaySet =
        displaySets.find(
          ds =>
            !dirtyViewportPanes.some(
              v => v.displaySetInstanceUID === ds.displaySetInstanceUID
            )
        ) || displaySets[displaySets.length - 1];

      dirtyViewportPanes.push(foundDisplaySet);
    }

    dirtyViewportPanes.forEach((vp, i) => {
      if (vp && vp.StudyInstanceUID) {
        this.setViewportData({
          viewportIndex: i,
          StudyInstanceUID: vp.StudyInstanceUID,
          displaySetInstanceUID: vp.displaySetInstanceUID,
        });
      }
    });
  };

  setViewportData = ({
    viewportIndex,
    StudyInstanceUID,
    displaySetInstanceUID,
  }) => {
    let displaySet = this.findDisplaySet(
      this.props.studies,
      StudyInstanceUID,
      displaySetInstanceUID
    );

    const { LoggerService, UINotificationService } = servicesManager.services;

    if (displaySet.isDerived) {
      const { Modality } = displaySet;
      if (Modality === 'SEG' && servicesManager) {
        const onDisplaySetLoadFailureHandler = error => {
          LoggerService.error({ error, message: error.message });
          UINotificationService.show({
            title: 'DICOM Segmentation Loader',
            message: error.message,
            type: 'error',
            autoClose: true,
          });
        };

        const {
          referencedDisplaySet,
          activatedLabelmapPromise,
        } = displaySet.getSourceDisplaySet(
          this.props.studies,
          true,
          onDisplaySetLoadFailureHandler
        );
        displaySet = referencedDisplaySet;

        activatedLabelmapPromise.then(activatedLabelmapIndex => {
          const selectionFired = new CustomEvent(
            'extensiondicomsegmentationsegselected',
            {
              detail: { activatedLabelmapIndex: activatedLabelmapIndex },
            }
          );
          document.dispatchEvent(selectionFired);
        });
      } else if (Modality !== 'SR') {
        displaySet = displaySet.getSourceDisplaySet(this.props.studies);
      }

      if (!displaySet) {
        const error = new Error('Source data not present');
        const message = 'Source data not present';
        LoggerService.error({ error, message });
        UINotificationService.show({
          autoClose: false,
          title: 'Fail to load series',
          message,
          type: 'error',
        });
      }
    }

    if (displaySet.isSOPClassUIDSupported === false) {
      const error = new Error('Modality not supported');
      const message = 'Modality not supported';
      LoggerService.error({ error, message });
      UINotificationService.show({
        autoClose: false,
        title: 'Fail to load series',
        message,
        type: 'error',
      });
    }
    this.props.setViewportSpecificData(viewportIndex, displaySet);
    if (displaySet.frameRate !== undefined) {
      this.props.setViewportSpecificData(viewportIndex, {
        cine: {
          cineFrameRate: 1000 / displaySet.frameRate,
          isPlaying: true,
        },
      });
    }
  };

  render() {
    const { viewportSpecificData } = this.props;
    const viewportData = values(viewportSpecificData);
    let numImagesLoaded = 0;
    clearTimeout(delaySetReferenceLines);
    delaySetReferenceLines = setTimeout(() => {
      if (viewportData.length > 1) {
        let tempinstanceUIDs = [];
        viewportData.forEach(inst => {
          tempinstanceUIDs.push(inst.displaySetInstanceUID);
        });
        //console.log('1 ++++++++++++++++++++++', viewportData)
        //console.log('2 ++++++++++++++++++++++', tempinstanceUIDs, instanceUIDs, _.isEqual(tempinstanceUIDs,instanceUIDs))
        if(!_.isEqual(tempinstanceUIDs,instanceUIDs)) {
          OHIF.viewer.ReferenceLines = false;
          cornerstoneTools.setToolDisabled('ReferenceLines', {
            synchronizationContext: OHIF.viewer.updateImageSynchronizer,
          });
          //
          instanceUIDs = _.clone(tempinstanceUIDs);
          //create synchronizer for reference-lines
          if(OHIF.viewer.updateImageSynchronizer) OHIF.viewer.updateImageSynchronizer.destroy();
          OHIF.viewer.updateImageSynchronizer = new cornerstoneTools.Synchronizer('cornerstonenewimage', cornerstoneTools.updateImageSynchronizer);
          //
          const views = document.getElementsByClassName('viewport-element');
          const handleImageRendered = evt => {
            evt.detail.element.removeEventListener('cornerstoneimagerendered', handleImageRendered);

            numImagesLoaded++;
            if (numImagesLoaded === viewportData.length) {
              for(let i=0;i<views.length;i++) {
                OHIF.viewer.updateImageSynchronizer.add(views[i]);
              }
            }
          };
          //
          for(let i=0;i<views.length;i++) {
            const element = views[i];
            element.addEventListener('cornerstoneimagerendered', handleImageRendered);
            cornerstone.enable(element);
          }

          const allstack = StackManager.getAllStacks();
          const data = {};
          for (let i = 0; i < viewportData.length; i++) {
            const vData = viewportData[i];
            data[i] = {imageIds: [], stack: {}};
            data[i].stack = _.clone(allstack[vData.displaySetInstanceUID]);
            data[i].stack.currentImageIdIndex = 0;
            data[i].imageIds = _.clone(allstack[vData.displaySetInstanceUID].imageIds);
            //
            const element = views[i];
            const _imageIds = data[i].imageIds;
            const _stack = data[i].stack;
            loadSeries(cornerstone, _imageIds, element, _stack);
          }
        }
      }
    }, 2000);
    return (
      <div className="ViewerMain">
        {this.state.displaySets.length && (
          <ConnectedViewportGrid
            isStudyLoaded={this.props.isStudyLoaded}
            studies={this.props.studies}
            viewportData={viewportData}
            setViewportData={this.setViewportData}
          >
            {/* Children to add to each viewport that support children */}
          </ConnectedViewportGrid>
        )}
      </div>
    );
  }

  componentWillUnmount() {
    // Clear the entire viewport specific data
    const { viewportSpecificData } = this.props;
    Object.keys(viewportSpecificData).forEach(viewportIndex => {
      this.props.clearViewportSpecificData(viewportIndex);
    });

    // TODO: These don't have to be viewer specific?
    // Could qualify for other routes?
    // hotkeys.destroy();

    // Remove beforeUnload event handler...
    //window.removeEventListener('beforeunload', unloadHandlers.beforeUnload);
    // Destroy the synchronizer used to update reference lines
    OHIF.viewer.updateImageSynchronizer.destroy();
    // TODO: Instruct all plugins to clean up themselves
    //
    // Clear references to all stacks in the StackManager
    //StackManager.clearStacks();
    // @TypeSafeStudies
    // Clears OHIF.viewer.Studies collection
    //OHIF.viewer.Studies.removeAll();
    // @TypeSafeStudies
    // Clears OHIF.viewer.StudyMetadataList collection
    //OHIF.viewer.StudyMetadataList.removeAll();
  }
}

function loadSeries(cornerstone, imageIds, element, stack) {
  // Cache all images and metadata
  imageIds.forEach(imageId => cornerstone.loadAndCacheImage(imageId));

  // Load and display first image in stack
  return cornerstone.loadImage(imageIds[0]).then(image => {
    // display this image
    //cornerstone.displayImage(element, image);

    // set the stack as tool state
    cornerstoneTools.addStackStateManager(element, ['stack', 'ReferenceLines']);
    cornerstoneTools.addToolState(element, 'stack', stack);
  });
}

export default ViewerMain;
