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

var values = memoize(_values);
let firstDisplaySetInstanceUID = '';
let secondDisplaySetInstanceUID = '';

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
    this.updateNextFourImages = this.updateNextFourImages.bind(this);
    window.addEventListener('updateNextFourImages', this.updateNextFourImages);
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

  fillNextFourEmptyViewportPanes = () => {
    const { layout, viewportSpecificData } = this.props;
    const { displaySets } = this.state;
    //
    const dirtyViewportPanes = [];
    let maxKey = 0;
    for (let i=0;i<displaySets.length;i++) {
      if(displaySets[i].displaySetInstanceUID===viewportSpecificData[3].displaySetInstanceUID) {
        maxKey = i;
      }
    }
    const newViewportSpecificData = [];
    const newDisplaySetInstanceUIDs = [];
    for (let i=(maxKey+1);i<displaySets.length;i++) {
      newDisplaySetInstanceUIDs.push(displaySets[i].displaySetInstanceUID);
      newViewportSpecificData.push(displaySets[i]);
    }
    if(newDisplaySetInstanceUIDs.length<4) {
      for (let i=0;i<displaySets.length;i++) {
        if(newDisplaySetInstanceUIDs.length!==4) {
          newDisplaySetInstanceUIDs.push(displaySets[i].displaySetInstanceUID);
          newViewportSpecificData.push(displaySets[i]);
        }
      }
    }

    for (let i = 0; i < layout.viewports.length; i++) {
      const viewportPane = newViewportSpecificData[i];
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
    setTimeout(() => {
      if (viewportData.length > 1) {
        if (
          viewportData.length === 2 &&
          (viewportData[0].displaySetInstanceUID !==
            firstDisplaySetInstanceUID ||
            viewportData[1].displaySetInstanceUID !==
              secondDisplaySetInstanceUID)
        ) {
          firstDisplaySetInstanceUID = viewportData[0].displaySetInstanceUID;
          secondDisplaySetInstanceUID = viewportData[1].displaySetInstanceUID;
          if (firstDisplaySetInstanceUID !== secondDisplaySetInstanceUID) {
            const views = document.getElementsByClassName('viewport-element');
            const topgramElement = views[0];
            const chestElement = views[1];
            const handleImageRendered = evt => {
              evt.detail.element.removeEventListener(
                'cornerstoneimagerendered',
                handleImageRendered
              );

              numImagesLoaded++;
              if (numImagesLoaded === 2) {
                addReferenceLinesTool(topgramElement, chestElement);
              }
            };
            topgramElement.addEventListener(
              'cornerstoneimagerendered',
              handleImageRendered
            );
            chestElement.addEventListener(
              'cornerstoneimagerendered',
              handleImageRendered
            );
            const elements = [topgramElement, chestElement];
            elements.forEach(element => {
              cornerstone.enable(element);
            });

            const allstack = StackManager.getAllStacks();
            const data = {
              0: {
                imageIds: [],
                stack: {},
              },
              1: {
                imageIds: [],
                stack: {},
              },
            };
            for (let i = 0; i < viewportData.length; i++) {
              const vData = viewportData[i];
              data[i].stack = _.clone(allstack[vData.displaySetInstanceUID]);
              data[i].stack.currentImageIdIndex = 0;
              data[i].imageIds = _.clone(
                allstack[vData.displaySetInstanceUID].imageIds
              );
            }
            //
            const topgramImageIds = data[0].imageIds;
            const chestImageIds = data[1].imageIds;
            const chestStack = data[1].stack;
            const topgramStack = data[0].stack;
            //
            loadSeries(cornerstone, chestImageIds, chestElement, chestStack);
            loadSeries(
              cornerstone,
              topgramImageIds,
              topgramElement,
              topgramStack
            );
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
    window.removeEventListener(
      'updateNextFourImages',
      this.updateNextFourImages
    );
    // TODO: These don't have to be viewer specific?
    // Could qualify for other routes?
    // hotkeys.destroy();

    // Remove beforeUnload event handler...
    //window.removeEventListener('beforeunload', unloadHandlers.beforeUnload);
    // Destroy the synchronizer used to update reference lines
    //OHIF.viewer.updateImageSynchronizer.destroy();
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

  updateNextFourImages(e) {
    const displaySets = this.getDisplaySets(this.props.studies);
    if (!displaySets || !displaySets.length || displaySets.length < 5) {
      return;
    }
    this.setState({ displaySets }, this.fillNextFourEmptyViewportPanes);
  }
}

//Adding lines for images and adding them to the synchronizer
function addReferenceLinesTool(firstElement, secondElement) {
  const synchronizer = new cornerstoneTools.Synchronizer(
    'cornerstonenewimage',
    cornerstoneTools.updateImageSynchronizer
  );

  synchronizer.add(firstElement);
  synchronizer.add(secondElement);

  cornerstoneTools.addTool(cornerstoneTools.ReferenceLinesTool);
  cornerstoneTools.setToolEnabled('ReferenceLines', {
    synchronizationContext: synchronizer,
  });
}

function loadSeries(cornerstone, imageIds, element, stack) {
  // Cache all images and metadata
  imageIds.forEach(imageId => cornerstone.loadAndCacheImage(imageId));

  // Load and display first image in stack
  return cornerstone.loadImage(imageIds[0]).then(image => {
    // display this image
    cornerstone.displayImage(element, image);

    // set the stack as tool state
    cornerstoneTools.addStackStateManager(element, ['stack', 'ReferenceLines']);
    cornerstoneTools.addToolState(element, 'stack', stack);
  });
}

export default ViewerMain;
