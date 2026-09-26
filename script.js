'use strict';

// workout class
class Workout {
  date = new Date()
  id = (Date.now() + '').slice(-10)
  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance; // km 
    this.duration = duration; // min
  }

  _setDescreption() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.discreption = `${this.type[0].toUpperCase()}${this.type.slice(1)} on  ${months[this.date.getMonth()]} ${this.date.getDate()}`
    return this.discreption
  }


}

class Running extends Workout {
  type = 'running'
  constructor(coords, distance, duration, cadance) {
    super(coords, distance, duration)
    this.cadance = cadance;
    this.calcPace()
    this._setDescreption()

  }

  calcPace() {
    // min / km
    this.pace = this.duration / this.distance
    return this.pace
  }
}

class Cycling extends Workout {
  type = 'cycling'
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration)
    this.elevationGain = elevationGain;
    this.calcSpeed()
    this._setDescreption()
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60)
    return this.speed
  }
}

const sortBtn = document.querySelector('.sort-checkbox')
const collectBnt = document.querySelector('.collect-markers-btn')
const messageEl = document.querySelector('.error-message')
const form = document.querySelector('.form');
const editForm = document.querySelector('.edit-form')
const resetBtn = document.querySelector('.reset-btn')
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistanceEdit = document.querySelector('.form__input--edit-distance')
const inputDurationEdit = document.querySelector('.form__input--edit-duration')
const inputCadanceEdit = document.querySelector('.form__input--edit-cadence')
const inputEelvationEdit = document.querySelector('.form__input--edit-elevation')
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const sidebarCloseBtn = document.querySelector('.sidebar-toggle-btn')
const openSidebarBtn = document.querySelector('.open-sidebar-btn')
const slider = document.querySelector('.sidebar')

// App class
class App {

  #map;
  #mapZoomLevel = 13
  #mapEvent;
  #marker;
  #myMarkers = [];
  #workouts = []
  #drawnItems
  #drawnItemsArr = []
  #editingId = null;
  constructor() {
    this._getPosition()

    // Get datea from local storage
    this._getLocalStorage()

    // attach event handlars 
    form.addEventListener('submit', this._newWorkout.bind(this))
    editForm.addEventListener('submit', this._saveEdit.bind(this))
    inputType.addEventListener('change', this._toggleElevationField.bind(this))
    containerWorkouts.addEventListener('click', (e) => {
      this._moveToPopup(e)
      this._editWorkout(e)
    })
    resetBtn.addEventListener('click', this._reset.bind(this))
    containerWorkouts.addEventListener('click', this._deleteWorkout.bind(this))
    sortBtn.addEventListener('change', this._sortingWorkouts.bind(this))
    collectBnt.addEventListener('click', this._collectMarkers.bind(this))
    openSidebarBtn.addEventListener('click', this._sliderToggle.bind(this))
    sidebarCloseBtn.addEventListener('click', this._sliderToggle.bind(this))
  }

  get _isWorkout() {
    return this.#workouts.some(work => work)
  }


  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function () {
        alert('Could not get your position!')
      })
  }

  _loadMap(position) {

    const { latitude, longitude } = position.coords

    const coords = [latitude, longitude]
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.#map);

    L.marker(coords).addTo(this.#map)
      .bindPopup('A pretty CSS popup.<br> Easily customizable.')
      .openPopup();

    this.#drawnItems = new L.FeatureGroup();
    this.#map.addLayer(this.#drawnItems);

    const drawControl = new L.Control.Draw({
      edit: {
        featureGroup: this.#drawnItems
      },
      draw: {
        polyline: true,
        polygon: true,
        circle: true,
        rectangle: true,
        circlemarker: false
      }
    });
    this.#map.addControl(drawControl);


    this.#map.on('draw:created', this._drawToolBar.bind(this));


    this.#map.addControl(drawControl);
    // handling clickes on map
    this.#map.on('click', this._showFormOnMapClick.bind(this))

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work)
    })
  }

  _showFormOnMapClick(mapE) {
    this.#mapEvent = mapE
    editForm.style.display = 'none'
    editForm.classList.add('hidden')
    form.style.display = 'grid'
    form.classList.remove('hidden')
    inputDistance.focus()

    // restart sort btn 
    this._setChecked()

    if (slider.classList.contains('hidden'))
      this._sliderToggle()
  }


  _hideForm() {
    // Empty inputs
    inputElevation.value = inputDuration.value = inputCadence.value = inputDistance.value = ''

    form.style.display = 'none'
    form.classList.add('hidden')
    setTimeout(() => form.style.display = 'grid', 600)
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden')
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden')
  }

  _newWorkout(e) {

    const validInputs = (...inputs) => inputs.every(inp => Number.isFinite(inp))
    const allPositive = (...inputs) => inputs.every(inp => inp > 0)
    e.preventDefault()

    // Get data from the form 
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng
    let workout;

    // if workout running, crate runnning object 
    if (type === 'running') {
      const cadance = +inputCadence.value;
      // check data validation 
      if (!validInputs(distance, duration, cadance) || !allPositive(distance, duration, cadance)) {
        this._erroMessage('remove')
        return
      }

      workout = new Running([lat, lng], distance, duration, cadance)

    }
    // if workout cycling, crate cycling object 
    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      // check data validation 
      if (!validInputs(distance, duration, elevation) || !allPositive(distance, duration)) {
        this._erroMessage('remove')

        return
      }

      workout = new Cycling([lat, lng], distance, duration, elevation)
    }

    // add new object to the workout arry 
    this.#workouts.push(workout)
    // Render workout on map as mark
    this._renderWorkoutMarker(workout)

    // Render workout on list 
    this._renderWorkot(workout)

    // hide form + clear input fields
    this._hideForm()

    // set local storage to all workouts 
    this._setLocalStorage()

    this._erroMessage('add')

  }

  _renderWorkoutMarker(workout) {

    const { coords } = workout
    this.#marker = L.marker(coords).addTo(this.#map)
      .bindPopup(L.popup({
        maxWidth: 250,
        minWidth: 100,
        autoClose: false,
        closeOnClick: false,
        className: `${workout.type}-popup`,
      })
      )
      .setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.discreption}`)
      .openPopup();

    this.#myMarkers.push(this.#marker)
  }

  _renderWorkot(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
    <button class="edit-btn" data-tooltip="Edit workout">&#9998;</button>
    <button class="delete-btn" data-tooltip="Delete workout">&times;</button>
      <h2 class="workout__title">${workout.discreption}</h2>
      <div class="workout__details">
        <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
        <span class="workout__value">${workout.distance}</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
      </div>
    `

    if (workout.type === 'running')
      html += `
     <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadance}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>
    `

    if (workout.type === 'cycling')
      html += `
    <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li> 
    `
    editForm.insertAdjacentHTML('afterend', html)
  }


  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout')

    if (!workoutEl) return

    const workout = this.#workouts.find(work => work.id === workoutEl.dataset.id)
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      }
    })

  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts))
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'))
    if (!data) return
    console.log(data);
    // rebiuld the objects or data comming from local storage
    data.forEach(work => {
      if (work.type === 'running') {
        work.__proto__ = Object.create(Running.prototype)
        work.__proto__.constructor = Running
      }

      if (work.type === 'cycling') {
        work.__proto__ = Object.create(Cycling.prototype)
        work.__proto__.constructor = Cycling
      }
    })
    this.#workouts = data;
    this.#workouts.forEach(work => {
      this._renderWorkot(work)
    })
  }

  _clearAllMarkers() {
    this.#myMarkers.forEach(marker => this.#map.removeLayer(marker));
    this.#myMarkers = [];
  }

  _reset() {
    // clear all markers on the map 
    this._clearAllMarkers()

    // clear all drawn items on the map
    this._removeAllDrwaItems()

    // Clear all data
    localStorage.removeItem('workouts')
    this.#workouts = []
    containerWorkouts.querySelectorAll('.workout').forEach(el => el.remove());

    // hide form 
    this._hideForm()
  }

  _editWorkout(e) {
    const editBtn = e.target.closest('.edit-btn')
    if (!editBtn) return

    const workoutEl = editBtn.closest('.workout')
    if (!workoutEl) return

    const workout = this.#workouts.find(work => work.id === workoutEl.dataset.id)
    if (!workout) return

    this.#editingId = workout.id

    inputDistanceEdit.value = workout.distance
    inputDurationEdit.value = workout.duration

    if (workout.type === 'running') {
      inputCadanceEdit.value = workout.cadance
      inputCadanceEdit.closest('.form__row').classList.remove('form__row--hidden')
      inputEelvationEdit.closest('.form__row').classList.add('form__row--hidden')
    }
    if (workout.type === 'cycling') {
      inputEelvationEdit.value = workout.elevationGain
      inputEelvationEdit.closest('.form__row').classList.remove('form__row--hidden')
      inputCadanceEdit.closest('.form__row').classList.add('form__row--hidden')
    }

    form.style.display = 'none'
    form.classList.add('hidden')
    editForm.style.display = 'grid'
    editForm.classList.remove('hidden')
    inputDistanceEdit.focus()

    this._setChecked()
  }

  _saveEdit(e) {
    e.preventDefault()
    if (!this.#editingId) return

    const distance = +inputDistanceEdit.value
    const duration = +inputDurationEdit.value

    const validInputs = (...inputs) => inputs.every(inp => Number.isFinite(inp))
    const allPositive = (...inputs) => inputs.every(inp => inp > 0)

    const workout = this.#workouts.find(work => work.id === this.#editingId)
    if (!workout) return

    if (workout.type === 'running') {
      const cadance = +inputCadanceEdit.value
      if (!validInputs(distance, duration, cadance) || !allPositive(distance, duration, cadance))
        return this._erroMessage('remove')
      workout.distance = distance
      workout.duration = duration
      workout.cadance = cadance
      workout.pace = workout.duration / workout.distance
    }

    if (workout.type === 'cycling') {
      const elevation = +inputEelvationEdit.value
      if (!validInputs(distance, duration, elevation) || !allPositive(distance, duration))
        return alert('Inputs has to be positive numbers!')
      workout.distance = distance
      workout.duration = duration
      workout.elevationGain = elevation
      workout.speed = workout.distance / (workout.duration / 60)
    }

    this._erroMessage('add')

    this._setLocalStorage()
    containerWorkouts.querySelectorAll('.workout').forEach(el => el.remove())
    this.#workouts.forEach(work => this._renderWorkot(work))

    this._hideEditForm()
    this.#editingId = null
  }

  _showEditForm() {
    editForm.classList.remove('hidden')
    inputDistanceEdit.focus()
  }

  _hideEditForm() {
    inputDistanceEdit.value = inputDurationEdit.value = inputCadanceEdit.value = inputEelvationEdit.value = ''
    editForm.style.display = 'none'
    editForm.classList.add('hidden')
    setTimeout(() => editForm.style.display = 'grid', 600)
  }

  // deleting the workout
  _deleteWorkout(e) {
    const deleteBtn = e.target.closest('.delete-btn')
    if (!deleteBtn) return

    const workoutEle = e.target.closest('.workout')
    if (!workoutEle) return

    // Get workout element id
    const workoutEleId = workoutEle.dataset.id

    // Get the workout index on the workouts array using id
    const workoutINDEX = this.#workouts.findIndex(work => work.id === workoutEleId)
    // delete elemetn form workout arry 
    this.#workouts.splice(workoutINDEX, 1)

    // delete marker form mymarkers array 
    const marker = this.#myMarkers.splice(workoutINDEX, 1)

    // remove marker fom the map 
    this.#map.removeLayer(marker[0]);

    // delete element form workout list 
    workoutEle.remove()

    // update the local storage
    this._setLocalStorage()

  }

  _sortingWorkouts() {
    const allworkouts = document.querySelectorAll('.workout')
    const data = JSON.parse(localStorage.getItem('workouts'))

    if (sortBtn.checked) {

      allworkouts.forEach(workout => workout.remove())
      console.log(data);
      const sortedWorkouts = data.toSorted(work => {
        if (work.type === 'running') return 1
        if (work.type === 'cycling') return -1
      })
      sortedWorkouts.forEach(work => this._renderWorkot(work))

    } else {
      allworkouts.forEach(workout => workout.remove())
      data.forEach(work => this._renderWorkot(work))
    }

  }

  _setChecked() {
    if (!sortBtn) return
    sortBtn.checked = false
  }

  _erroMessage(method) {
    messageEl.classList[method]('hidden')
  }

  _collectMarkers(e) {
    const target = e.target.closest('.collect-markers-btn')
    console.log(target);

    if (!this.#marker) return

    if (!target) return


    const markersGroup = L.featureGroup(this.#myMarkers).addTo(this.#map);
    this.#map.fitBounds(markersGroup.getBounds(), {
      padding: [130, 130],
      maxZoom: 15,
      animate: true,
      duration: 1.5,
    });
  }

  _drawToolBar(e) {

    // handling hide the form after add shape that needed aclick on map
    console.log(e);
    const hideForms = () => {
      this._hideForm();
      this._hideEditForm();
    }

    const type = e.layerType;
    const layer = e.layer;

    if (type === 'polygon') {
      hideForms()
      layer.bindPopup('Polygon');
    }


    if (type === 'polyline') {
      hideForms()
      layer.bindPopup('Line')
    }


    if (type === 'circle') {
      hideForms()
      layer.bindPopup('Circle')

    }

    if (type === 'rectangle') {
      hideForms()
      layer.bindPopup('Rectangle')
    }
    this.#drawnItems.addLayer(layer);
    this.#drawnItemsArr.push(layer)
    console.log(this.#drawnItemsArr);
  }

  _removeAllDrwaItems() {
    this.#drawnItems.clearLayers();
    this.#drawnItemsArr = [];

  }


  _sliderToggle() {
    slider.classList.toggle('hidden')

  }
}



const app = new App();