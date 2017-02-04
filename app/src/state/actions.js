export const ADD_CONTROL_POINT = 'ADD_CONTROL_POINT';
export function addControlPoint(imageIndex) {
  return {
    type: ADD_CONTROL_POINT,
    imageIndex
  }
}

export const DELETE_CONTROL_POINT = 'DELETE_CONTROL_POINT';
export function deleteControlPoint(id) {
  return {
    type: DELETE_CONTROL_POINT,
    id
  }
}

export const UPDATE_CONTROL_POINT = 'UPDATE_CONTROL_POINT';
export function updateControlPoint(loc) {
  return {
    type: UPDATE_CONTROL_POINT,
    loc
  }
}

export const TOGGLE_CONTROL_POINT_MODE = 'TOGGLE_CONTROL_POINT_MODE';
export function toggleControlPointMode(imageIndex, pointId, point=null) {
  return {
    type: TOGGLE_CONTROL_POINT_MODE,
    imageIndex,
    pointId,
    point
  }
}

export const SET_CONTROL_POINT_POSITION = 'SET_CONTROL_POINT_POSITION';
export function setControlPointPosition(loc, id, pos) {
  return {
    type: SET_CONTROL_POINT_POSITION,
    loc,
    id,
    pos
  }
}




export const SELECT_IMAGE = 'SELECT_IMAGE';
export function selectImageFile(index) {
  return {
    type: SELECT_IMAGE,
    index
  }
}

export const RECEIVE_IMAGE_FILES = 'RECEIVE_IMAGE_FILES';
// Expects an array of File / Blob objects or strings
export function receiveImageFiles(files) {
  // var isFileObjects = Object.prototype.toString.call(files[0]) === '[object File]' || Object.prototype.toString.call(files[0]) === '[object Blob]';

  let now = +new Date();
  files.forEach((f,i) => {
    f.id = now + i;
  });

  return {
    type: RECEIVE_IMAGE_FILES,
    items: files,
    receivedAt: now
  }
}
