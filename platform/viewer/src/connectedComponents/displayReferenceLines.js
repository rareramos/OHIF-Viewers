import $ from 'jquery';
//import { cornerstone, cornerstoneTools } from 'meteor/ohif:cornerstone';
import OHIF from '@ohif/core';
import cornerstoneTools from 'cornerstone-tools';
import cornerstone from 'cornerstone-core';

/**
 * This function disables reference lines for a specific viewport element.
 * It also enables reference lines for all other viewports with the
 * class .imageViewerViewport.
 *
 * @param element {node} DOM Node representing the viewport element
 */
export async function displayReferenceLines(element) {
  // Check if image plane (orientation / loction) data is present for the current image
  const enabledElement = cornerstone.getEnabledElement(element);
  //const enabledElement = cornerstone.enable(element);

  //console.log('******', enabledElement, !enabledElement, !enabledElement.image, (!enabledElement || !enabledElement.image));
  // Check if element is already enabled and it's image was rendered
  if (!enabledElement || !enabledElement.image) {
    OHIF.log.info(
      "displayReferenceLines enabled element is undefined or it's image is not rendered"
    );
    return;
  }

  const imageId = enabledElement.image.imageId;
  //const imagePlane = cornerstone.metaData.get('imagePlane', imageId);

  // Disable reference lines for the current element
  //cornerstoneTools.setToolDisabledForElement(element, 'referenceLines');

  OHIF.log.info(`displayReferenceLines for image with id: ${imageId}`);
  //synchronizer.add(element);

  //cornerstoneTools.addStackStateManager(element, ['stack', 'Crosshairs']);
  //cornerstoneTools.addToolState(element, 'stack', firstStack);
  // Loop through all other viewport elements and enable reference lines
  $('.viewport-container')
    //.not(element)
    .each((index, viewportElement) => {
      let imageId;
      if ($(viewportElement).find('canvas').length) {
        cornerstone.enable(viewportElement);
        const enabledElement = cornerstone.getEnabledElement(viewportElement);
        console.log('000000000000000000000000000 ', enabledElement);
        /*try {
          const enabledElement = cornerstone.getEnabledElement(viewportElement);
          imageId = enabledElement.image.imageId;
        } catch (error) {
          return;
        }

        if (!imageId) {
          return;
        }*/

        //cornerstoneTools.addTool(cornerstoneTools.ReferenceLinesTool);
        //console.log('^^^^^^^^^^^^^^^^^ cornerstoneTools.setToolEnabledForElement', cornerstoneTools.addToolForElement);
        cornerstoneTools.addToolForElement(
          viewportElement,
          cornerstoneTools.ReferenceLinesTool,
          {
            synchronizationContext: OHIF.viewer.synchronizer,
            //synchronizationContext: OHIF.viewer.updateImageSynchronizer,
            name: 'ReferenceLinesTool',
            configuration: {}
          }
        );

        cornerstoneTools.setToolEnabledForElement(
          viewportElement,
          'ReferenceLinesTool',//'referenceLines',
          {
            synchronizationContext: OHIF.viewer.synchronizer,
            //synchronizationContext: OHIF.viewer.updateImageSynchronizer,
          }
        );
        //cornerstoneTools.setToolEnabled('ReferenceLinesTool', {});
        cornerstoneTools.setToolActive('ReferenceLinesTool', {mouseButtonMask: 1});

        //console.log('############################', cornerstone.getEnabledElements());
      }
    });
}
