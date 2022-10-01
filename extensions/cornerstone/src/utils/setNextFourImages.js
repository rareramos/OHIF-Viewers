import { redux } from '@ohif/core';

const { setNextFour } = redux.actions;

/**
 * Page for next four images
 *
 * @return void
 */
const setNextFourImages = (viewports, viewportSpecificData) => {
  const action = setNextFour({viewports}, viewportSpecificData);

  window.store.dispatch(action);
}

export default setNextFourImages;
