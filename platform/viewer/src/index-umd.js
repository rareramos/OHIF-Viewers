/**
 * Entry point index.js for UMD packaging
 */
import 'regenerator-runtime/runtime';

import React from 'react';
import ReactDOM from 'react-dom';
import App from './App.js';

/**
 * EXTENSIONS
 * =================
 *
 * Importing and modifying the extensions our app uses HERE allows us to leverage
 * tree shaking and a few other niceties. However, by including them here they become
 * "baked in" to the published application.
 *
 * Depending on your use case/needs, you may want to consider not adding any extensions
 * by default HERE, and instead provide them via the extensions configuration key or
 * by using the exported `App` component, and passing in your extensions as props using
 * the defaultExtensions property.
 */
 import OHIFVTKExtension from '@ohif/extension-vtk';
 import OHIFDicomHtmlExtension from '@ohif/extension-dicom-html';
 import OHIFDicomSegmentationExtension from '@ohif/extension-dicom-segmentation';
 import OHIFDicomRtExtension from '@ohif/extension-dicom-rt';
 import OHIFDicomMicroscopyExtension from '@ohif/extension-dicom-microscopy';
 import OHIFDicomPDFExtension from '@ohif/extension-dicom-pdf';
 import OHIFDicomTagBrowserExtension from '@ohif/extension-dicom-tag-browser';
 // Add this for Debugging purposes:
 import OHIFDebuggingExtension from '@ohif/extension-debugging';


function installViewer(config, containerId = 'root', callback) {
  const container = document.getElementById(containerId);

  if (!container) {
    throw new Error(
      "No root element found to install viewer. Please add a <div> with the id 'root', or pass a DOM element into the installViewer function."
    );
  }
  config.extensions = [
    OHIFVTKExtension,
    OHIFDicomHtmlExtension,
    OHIFDicomMicroscopyExtension,
    OHIFDicomPDFExtension,
    OHIFDicomSegmentationExtension,
    OHIFDicomRtExtension,
    OHIFDebuggingExtension,
    OHIFDicomTagBrowserExtension,
  ];

  return ReactDOM.render(<App config={config} />, container, callback);
}

export { App, installViewer };
