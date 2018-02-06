import React, { Component } from 'react';
import ImagePanZoom from './ImagePanZoom';

class Images extends Component {

  constructor(props) {
    super(props);
    this.onImagePositionChange = this.onImagePositionChange.bind(this);
    this.toggleEditing = this.toggleEditing.bind(this);
  }

  componentDidMount() {}

  onImageSelect(idx) {
    const { selectImageFile, imagery } = this.props;
    if (imagery.selected === idx) return;
    selectImageFile(idx);
  }

  onImageDelete(id) {
    if (!id) return;

    const { controlpoints, deleteImageFile } = this.props;
    if (controlpoints.active) return;

    deleteImageFile(id);
  }

  onImagePositionChange(center, xy, markerId) {
    const { controlpoints, onImagePositionChange, setControlPointPosition } = this.props;
    onImagePositionChange(center);

    // update control point if in edit mode
    if (controlpoints.active && markerId) {
      setControlPointPosition('image', markerId, xy);
    }
  }

  toggleEditing(evt, imgIndex, imgName, pointtId, addPt) {
    evt.preventDefault();

    if (!addPt) return this.props.toggleControlPointMode(imgIndex, imgName, pointtId, null);

    let positions = this.props.getPositions();
    this.props.toggleControlPointMode(imgIndex, imgName, pointtId, {
      image: [...positions.image],
      map: [positions.map.lat, positions.map.lng]
    });
  }

  deleteGCP(id) {
    this.props.deleteControlPoint(id);
  }

  renderPoints(imgIndex, imgName, isSelected) {
    const { controlpoints } = this.props;
    let klass;
    let points = [];

    controlpoints.points.forEach((pt, idx) => {
      if (pt.imageName !== imgName) return;
      let klass = [];
      if (controlpoints.active && pt.id === controlpoints.pointId && !controlpoints.adding) klass.push('active');
      if (controlpoints.active && controlpoints.adding) klass.push('disabled');
      if (!isSelected) klass.push('not-selected');

      points.push(
        <li key={`pt-${idx}`} className={klass.join(' ')}>
          <button onClick={(evt) => {this.toggleEditing(evt, imgIndex, imgName, pt.id);}}>
          <span className={`icon gcp ${klass}`} role='presentation'></span>Ground Control Point</button>
          <span className='icon remove' onClick={() => {this.deleteGCP(pt.id);}}></span>
        </li>
      );
    });

    if (!isSelected) return points;

    klass = [];
    if (controlpoints.active && controlpoints.adding) klass.push('active');
    points.push(<li key='pt' className={klass.join(' ')}><button onClick={(evt) => {this.toggleEditing(evt, imgIndex, imgName, null, true);}}><span className={`icon gcp add ${klass}`}></span>Add Ground Control Point</button></li>);
    return points;
  }

  renderImages() {
    const { imagery, controlpoints, windowSize } = this.props;
    let imageryItems = imagery.items ? imagery.items : [];
    let imagesLength = Math.max(imageryItems.length, 5);
    let range = Array.from({ length: imagesLength }, (value, key) => key);

    return range.map(idx => {
      let image = imageryItems[idx];
      let isSelected = imagery.selected === idx;
      let image_name = image ? image.name : '';
      let id = image ? image.id : null;

      let klasses = [];
      if (imagery.selected === idx) klasses.push('selected');
      if (!image) klasses.push('empty');

      let detailsKlass = controlpoints.active ? ' no-remove' : '';

      return (
        <li key={`image-${idx}`} className={klasses.join(' ')} onClick={() => this.onImageSelect(idx)}>
          <div className='wrapper'>
            <div className={`details${detailsKlass}`}>
              <span className='blocker'></span>
              <span className='icon add' role='presentation'></span>
              <span className='img-name'>{image_name}</span>
              <span className='icon remove' onClick={() => this.onImageDelete(id)}></span>
            </div>
            { image &&
            <ul className='gcp-controls'>
              {this.renderPoints(idx, image_name, isSelected)}
            </ul>
            }
            { image && isSelected &&

            <div className='img-container'>
              <ImagePanZoom
                windowSize={windowSize}
                image={imagery.items[imagery.selected]}
                selectedImage={imagery.selected}
                points={controlpoints.points}
                markerDraggable={controlpoints.active}
                selectedMarker={controlpoints.pointId}
                onImagePositionChange={this.onImagePositionChange}/>
            </div>
            }
          </div>
        </li>
      );
    });
  }

  render() {
    if (typeof this.props.imagery === 'undefined') return null;

    return (
      <div className='images-module' ref={el => {this.imageModule = el;}}>
        <ul className='list-reset'>
          {this.renderImages()}
        </ul>
      </div>
    );
  }
}

export default Images;