import proj4 from 'proj4';
import { getProj4Utm, parseUtmDescriptor } from '../../common/coordinate-systems';

import { createReducer } from '../utils/common';
import * as actions from '../actions';
import { validate, imagePoint, joinedPoints, mapPoint, getModeFromId, CP_TYPES, CP_MODES } from '../utils/controlpoints';


const removeMapPointFromJoins = (joins, map_id) => {
  let r = {};
  let keys = Object.keys(joins);

  keys.forEach(k => {
    if (joins.hasOwnProperty(k) && k !== map_id) {
      r[k] = [...joins[k]];
    }
  });

  // nothing was changed, return orignial
  if (keys.length === Object.keys(r).length) return joins;

  return r;
}

const removeImagePointFromJoins = (joins,  img_id) => {
  let touched = false;

  Object.keys(joins).forEach(k => {
    if (joins.hasOwnProperty(k) && joins[k].indexOf(img_id) > -1) {
      joins[k] = joins[k].filter(d => d !== img_id);
      touched = true;
    }
  });

  // nothing was changed, return orignial
  if (!touched) return joins;

  return {
    ...joins
  };
}

const removeFromJoins = (joins, pt) => {
  if (pt.type === CP_TYPES.MAP) return removeMapPointFromJoins(joins, pt.id);
  return removeImagePointFromJoins(joins, pt.id);
}

const onDeleteImage = (state, action) => {
  let pts = state.points.filter(pt => {
    return pt.type === CP_TYPES.IMAGE && pt.img_name === action.img_name;
  });

  if (!pts.length) return state;

  let joins; // = {...joins};
  pts.forEach(pt => {
    joins = removeFromJoins(joins, pt);
  });

  let points = state.points.filter(pt => {
    if (pt.type === CP_TYPES.MAP) return true;
    return pt.img_name !== action.img_name;
  });

  return {
    ...state,
    mode: null,
    selected: null,
    points,
    joins,
    status: validate(points, joins)
  }
}

const deletePoint = (state, action) => {
  let pt = state.points.find(p => p.id === action.id);

  if (pt === undefined) return state;

  let st = {
    ...state,
    selected: null,
    mode: null,
    points: state.points.filter(p => {
      return p.id !== action.id;
    })
  }

  st.joins = removeFromJoins(st.joins, pt);
  st.status = validate(st.points, st.joins);

  return st;
}

const joinPoints = (joins, img_id, map_id) => {
  if (!joins.hasOwnProperty(map_id)) {
    joins[map_id] = [];
  }

  // Check if image point exists for a particular map point
  // If exists remove it
  if (joins[map_id].indexOf(img_id) > -1) {
    console.warn(`Removing image point ${img_id} from map point ${map_id}`);

    return {
      ...joins,
      [map_id]: joins[map_id].filter(d => d !== img_id)
    }
  }

  return {
    ...joins,
    [map_id]: [...joins[map_id], img_id]
  };
}


const joinPoint = (state, action) => {
  let img_id = state.mode === CP_MODES.IMAGE_EDIT ?
    state.selected :
    action.id;

  let map_id = state.mode === CP_MODES.MAP_EDIT ?
    state.selected :
    action.id;

  if (img_id === null && map_id === null ) return state;

  return {
    ...state,
    selected: null,
    mode: null,
    joins: joinPoints(state.joins, img_id, map_id)
  }
}

const highlightPoint = (state, action) => {
  let highlighted = [];
  if (action.id) {
    highlighted = joinedPoints(state.joins, action.id);
  }
  return {
    ...state,
    highlighted: highlighted
  };
}

// img_name, img_coord, map_coord
const addPoint = (state, action) => {
  let pt = action.isImage ? imagePoint(action.img_coord, action.img_name) :
                            mapPoint(action.map_coord);

  if (pt === null) return state;
  let points = [...state.points, pt];
  let joins = state.joins || {};

  return {
    ...state,
    points,
    joins,
    selected: pt.id,
    mode: getModeFromId(pt.id, points),
    status: validate(points, joins)
  };
}

const setPosition = (state, action) => {
  return {
    ...state,
    points: state.points.map((pt, idx) => {
              if (action.id === pt.id) {
                return {
                  ...pt,
                  coord: action.pos
                }
              }
              return pt;
            })
  }
}

const toggleMode = (state, action) => {
  let selected = (action.id === state.selected) ? null : action.id;
  let mode = selected ? getModeFromId(action.id, state.points) : null;

  return {
    ...state,
    selected,
    mode
  }
}

const syncImages = (state, action) => {
  let images = action.images || [];
  if (!images.length || !state.points.length) return state;

  return {
    ...state,
    points: state.points.map(pt => {
      let index = images.findIndex( img => img.name === pt.img_name );
      if (index < 0) return pt;

      return {
        ...pt,
        hasImage: true
      };
    })
  }
}

const parseRow = (row) => {
  let img_name, lat, lng, x, y, z, mapPointLabel;

  if (row.length === 6) {
    // If row length is 6, both image and coordinates are present
    [lng, lat, z, x, y, img_name] = row;
  }
  else if (row.length === 4) {
    // Just map points, no image
    [mapPointLabel, lng, lat, z] = row;
  }
  else if (row.length === 3) {
    // Just image points, no map coordinates
    [x, y, img_name] = row;
  }

  return { img_name, lat, lng, x, y, z, mapPointLabel };
}

const syncList = (state, action) => {
  let images = action.images || [];
  let rows = action.rows || []; // gcp file
  if (!rows.length) return state;

  let points = [...state.points];
  let joins = { ...state.joins };
  let selected = state.selected;

  let projection = action.sourceProjection;
  if (projection) {
    let utmProjection = parseUtmDescriptor(projection);
    if (utmProjection) projection = getProj4Utm(utmProjection.zone, utmProjection.hemisphere);
  }

  rows.forEach((r, i) => {
    let { img_name, lat, lng, x, y, mapPointLabel } = parseRow(r);

    let img_index = images.findIndex( img => img.name === img_name );
    let hasImage = img_index > -1;
    let imgPt, mapPt;

    if (x && y && img_name) {
      imgPt = imagePoint([x, y], img_name, hasImage);
    }

    if (lat && lng) {
      if (projection !== 'EPSG:4326') {
        // Transform into EPSG:4326
        [lng, lat] = proj4(projection, 'EPSG:4326', [lng, lat]);
      }
      mapPt = mapPoint([lat, lng], mapPointLabel);
    }

    if (imgPt) points.push(imgPt);
    if (mapPt) points.push(mapPt);

    if (imgPt && mapPt) {
      joins = joinPoints(joins, imgPt.id, mapPt.id);
    }

    if (!selected && imgPt) selected = imgPt.id;
  });

  return {
    ...state,
    points,
    joins,
    selected,
    mode: getModeFromId(selected, points),
    status: validate(points, joins)
  };
}

const awaitPoint = (state, action) => {
  if (state.mode === 'adding') return state;
  return {
    ...state,
    selected: null,
    mode: CP_MODES.ADDING
  }
}

const controlPointReducer = (state) => {
  return createReducer(state, {
    [actions.DELETE_CONTROL_POINT]: deletePoint,
    [actions.HIGHLIGHT_CONTROL_POINT]: highlightPoint,
    [actions.ADD_CONTROL_POINT]: addPoint,
    [actions.SET_CONTROL_POINT_POSITION]: setPosition,
    [actions.TOGGLE_CONTROL_POINT_MODE]: toggleMode,
    [actions.AWAIT_CONTROL_POINT]: awaitPoint,
    [actions.JOIN_CONTROL_POINT]: joinPoint,
    'SYNC_IMAGES_TO_POINTS': syncImages,
    'SYNC_LIST_TO_IMAGES': syncList,
    'ON_DELETE_IMAGE': onDeleteImage
  });
}

export default controlPointReducer;
