// This variable stores the current cell under touch point in case touch is available.
// In case touch is not available, it stores the current focused cell.
let selectedCell = null;
let data: number[] = [];
let dataHeaders: string[] = [];
let brailleData: string = null;
let focusedRowIndex: number = 0;
let focusedColIndex: number = 0;
let ttsName: string = getUrlParam('ttsName');
let intervalIDForReadAll = null;
let inReadAllMode = false;

function initializeViewScript() {
  // Initialize speech synthesis
  // If we don't do that, Chrome will speak the first utterance with the default TTS voice
  const synth: SpeechSynthesis = window.speechSynthesis;
  const utterance: SpeechSynthesisUtterance = new SpeechSynthesisUtterance('');
  synth.speak(utterance);
  processData();
  // In Chrome, we need to wait for the "voiceschanged" event to be fired before we can get the list of all voices. See
  //https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API
  // for more details
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = populateTtsList;
  }
  notifyUser();
}


function notifyUser() {
  let notificationText: string = 'The system works best with NVDA and Jaws screen readers, versions 2019 or later, with Firefox, Chrome and the new Chromium EDGE';
  document.getElementById('notificationDiv').innerHTML = notificationText;
  let localStorage = window.localStorage;
  if (localStorage.getItem('notifiedUser') !== 'true') {
    // @ts-ignore
    if (window.chrome) {
      document.getElementById('notificationDiv').setAttribute('role', 'alert');
    } else {
      alert(notificationText);
    }
    localStorage.setItem('notifiedUser', 'true');
  }
  if (!checkEnvironment()) {
    let messageText: string = 'This browser and OS combination is not supported. Please use Firefox, Chrome or Edge (based on Chromium) on Windows to get the best experience.';
    document.getElementById('warningMessage').innerHTML = messageText;
    let warnedUser: string = localStorage.getItem('warnedUser');
    if (warnedUser === 'true') {
      return;
    }
    localStorage.setItem('warnedUser', 'true');
    // @ts-ignore
    if (window.chrome) {
      document.getElementById('warningMessage').setAttribute('role', 'alert');
    } else {
      alert(messageText);
    }
    return;
  }
}


function checkEnvironment() {
  let userAgent = navigator.userAgent;
  if (userAgent.indexOf('Chrome') === -1 && userAgent.indexOf('Firefox') === -1) {
    return false;
  }
  if (userAgent.indexOf('Edge') !== -1) {
    return false;
  }
  if (navigator.appVersion.indexOf("Win") === -1) {
    return false;
  }
  return true;
}


function brailleControllerSelectionListener(event) {
  if (document.activeElement.id !== 'brailleControllerText') {
    return;
  }
  focusedRowIndex = dataHeaders.length == 0 ? 0 : 1;
  const position = event.position;
  const positionInData = position - (position / 40 | 0) * 11;
  if (position % 40 >= 0 && position % 40 < 29 && positionInData < data.length) {
    let cellSelector: string = `[row='${focusedRowIndex}'][col='${positionInData}']`;
    const cell = document.querySelectorAll(cellSelector)[0];
    updateSelectedCell(cell);
    brailleController.updateRightSideBraille(position);
  }
}


function processData() {
  const container: HTMLElement = document.getElementById('container');
  const graphDescription: string = getUrlParam('description');
  if (graphDescription !== '') {
    const graphDescriptionHeading: HTMLHeadingElement = document.createElement('h1');
    graphDescriptionHeading.innerText = graphDescription;
    graphDescriptionHeading.setAttribute('tabindex', '0');
    container.appendChild(graphDescriptionHeading);
    graphDescriptionHeading.focus();
  }
  const warnDiv: HTMLElement = document.createElement('div');
  warnDiv.id = 'warningMessage';
  container.appendChild(warnDiv);
  parseData(getUrlParam('data'));
  createTtsCombo(container);
  addReadEntireGraphButton(container);
  addAudioConfigOptions(container);
  const graphSummary: HTMLParagraphElement = document.createElement('p');
  graphSummary.innerText = getGraphSummary();
  container.appendChild(graphSummary);
  brailleController = new BrailleController(container, data);
  brailleController.setSelectionListener(brailleControllerSelectionListener);
  createGrid();
  addOnClickAndOnTouchSoundToGrid();
  addNavigationToGrid();
  const notificationDiv: HTMLElement = document.createElement('div');
  notificationDiv.id = 'notificationDiv';
  notificationDiv.setAttribute('tabindex', '0');
  container.appendChild(notificationDiv);
  addLiveRegion(container);
}


function addReadEntireGraphButton(container) {
  let readEntireGraphButton = document.createElement('button');
  readEntireGraphButton.innerHTML = 'Listen to the graph sound';
  readEntireGraphButton.id = 'readEntireGraph';
  readEntireGraphButton.addEventListener('click', readEntireGraph);
  container.appendChild(readEntireGraphButton);
}


function readEntireGraph(event) {
  document.getElementById('liveRegion').setAttribute('style', '');
  resetReadEntireGraph();
  inReadAllMode = true;
  document.getElementById('brailleControllerText').focus();
  brailleController.setCursorPosition(29);
  setIntervalX(moveCursor, 500, data.length + 1);
}


function setIntervalX(callback, delay, repetitions) {
  let x = 0;
  intervalIDForReadAll = window.setInterval(function () {
    callback();
    if (++x === repetitions) {
      resetReadEntireGraph();
      inReadAllMode = false;
      document.getElementById('liveRegion').setAttribute('style', 'display: none;');
    }
  }, delay);
}


let readEntireGraphPosition = 0;
function moveCursor() {
  brailleController.setCursorPosition(readEntireGraphPosition);
  readEntireGraphPosition++;
  if (readEntireGraphPosition === data.length + 1) {
    readEntireGraphPosition = 0;
  }
}


function resetReadEntireGraph() {
  window.clearInterval(intervalIDForReadAll);
  readEntireGraphPosition = 0;
}


function addAudioConfigOptions(container) {
  let fieldset = document.createElement('fieldset');
  let legend = document.createElement('legend');
  legend.innerHTML = 'Choose audio feedback types you want to hear while navigating the graph';
  fieldset.appendChild(legend);
  createCheckBoxWithLabel('valueOption', 'Value', fieldset);
  createCheckBoxWithLabel('positionOption', 'Position', fieldset);
  createCheckBoxWithLabel('soundOption', 'Sound', fieldset);
  createCheckBoxWithLabel('minMaxOption', 'Min / max value endication', fieldset);
  container.appendChild(fieldset);
}


function createCheckBoxWithLabel(id, labelText, container) {
  let checkBox = document.createElement('input');
  checkBox.type = 'checkbox';
  checkBox.id = id;
  checkBox.checked = true;
  container.appendChild(checkBox);
  let label = document.createElement('label');
  label.setAttribute('for', id);
  label.innerHTML = labelText;
  container.appendChild(label);
}

function addLiveRegion(container) {
  const liveRegion: HTMLParagraphElement = document.createElement('p');
  liveRegion.id = 'liveRegion';
  liveRegion.setAttribute('aria-live', 'assertive');
  liveRegion.className = 'hidden';
  liveRegion.setAttribute('style', 'display: none;');
  container.appendChild(liveRegion);
}


function createTtsCombo(container) {
  const ttsCombo: HTMLSelectElement = document.createElement('select');
  ttsCombo.setAttribute('id', 'ttsVoice');
  ttsCombo.addEventListener('change', onTtsComboChange);
  container.appendChild(ttsCombo);
  // This function is found in builder script
  populateTtsList();
  updateTtsCombo();
}


function onTtsComboChange(event: Event) {
  const ttsCombo: HTMLSelectElement = <HTMLSelectElement>document.getElementById('ttsVoice');
  ttsName = ttsCombo.options[ttsCombo.selectedIndex].getAttribute('data-name');
}


function createGrid() {
  const combinedDataAndHeaders: (number | string)[][] = (dataHeaders.length != 0 ? [dataHeaders, data] : [data]);
  const grid: HTMLDivElement = document.createElement('div');
  grid.setAttribute('role', 'grid');
  grid.setAttribute('id', 'grid');
  grid.setAttribute('aria-readonly', 'true');
  grid.setAttribute('aria-hidden', 'true');
  grid.style.width = '100%';
  grid.style.height = '90%';
  grid.setAttribute('class', 'table');

  combinedDataAndHeaders.forEach((_rowData: (number[] | string[]), rowIndex: number) => {
    const gridRow: HTMLDivElement = document.createElement('div');
    gridRow.setAttribute('role', 'row');
    gridRow.setAttribute('class', 'row');

    /**
     * The `combinedDataAndHeaders[0]` feels like it should be `combinedDataAndHeaders[rowIndex]`
     * however, that would require type hinting similar to _`combinedDataAndHeaders: string[][]`_
     */
    for (let colIndex = 0; colIndex < combinedDataAndHeaders[0].length; colIndex++) {
      const gridCell: HTMLDivElement = document.createElement('div');
      gridCell.setAttribute('role', 'gridcell');
      gridCell.setAttribute('class', 'cell');
      gridCell.append(document.createTextNode(combinedDataAndHeaders[rowIndex][colIndex].toString()));
      gridCell.setAttribute('aria-readonly', 'true');
      gridCell.setAttribute('row', rowIndex.toString());
      gridCell.setAttribute('col', colIndex.toString());
      gridRow.append(gridCell);
    }

    grid.append(gridRow);
  });

  document.getElementById('container').appendChild(grid);
}


function addOnClickAndOnTouchSoundToGrid() {
  document.querySelectorAll('[role="gridcell"]').forEach((element: HTMLElement, _index: number) => {
    element.addEventListener('click', onClick);
    element.addEventListener('touchstart', startSoundPlayback);
    element.addEventListener('touchmove', onCellChange);
    element.addEventListener('touchleave', stopSoundPlayback);
    element.addEventListener('touchcancel', stopSoundPlayback);
  });
}


/**
 * To-do: double-check type hints for `event` on `onClick` and `navigateGrid`
 * @link https://github.com/Microsoft/TypeScript/issues/299
 * @link https://developer.mozilla.org/en-US/docs/Web/API/Event
 */
function onClick(event) {
  updateSelectedCell(event.currentTarget);
  event.preventDefault();
}


function addNavigationToGrid() {
  document.querySelectorAll('[role="gridcell"]').forEach((gridCell: HTMLElement, index: number) => {
    gridCell.addEventListener('keydown', navigateGrid);
  });
}


function navigateGrid(event) {
  let currentCell = event.currentTarget;
  let newFocusedCell = null;
  switch (event.key) {
    case 'ArrowLeft':
      newFocusedCell = currentCell.previousSibling;
      break;
    case 'ArrowRight':
      newFocusedCell = currentCell.nextSibling;
      break;
    case 'ArrowDown':
      if (currentCell.parentNode.nextSibling != null) {
        const index: number = Number(currentCell.getAttribute('col'));
        newFocusedCell = currentCell.parentNode.nextSibling.childNodes[index];
      }
      break;
    case 'ArrowUp':
      if (currentCell.parentNode.previousSibling != null) {
        const index: number = Number(currentCell.getAttribute('col'));
        newFocusedCell = currentCell.parentNode.previousSibling.childNodes[index];
      }
      break;
    case 'Home':
      newFocusedCell = currentCell.parentNode.firstChild;
      break;
    case 'End':
      newFocusedCell = currentCell.parentNode.lastChild;
      break;
    default:
      return;
  }
  if (newFocusedCell !== null) {
    newFocusedCell.focus();
    updateSelectedCell(newFocusedCell);
  }
}


/**
* Maps (row, col) to a 2D coordinate. row and col are 0-based indices
* Returns a map with the x and y coordinates (e.g {x:1, y:0})
* The data part of the grid will be always with only 1 row, therefore, y coordinate will be always 0
* Examples:
* Cells in a 1X2 grid will be positioned between -0.5 and 0.5 in x, and y will be 0
* Cells in a 1X3 grid will be positioned between -1 and 1 in x, and y will be also 0
*/
function get2DCoordinates(_row: number, col: number): { x: number, y: number } {
  // Note, `_row` is not used within this function
  const colCount = data.length;
  let xCoord = col - (colCount / 2 | 0);
  // Align xCoord to be symmetric with respect to y-axis
  if (colCount % 2 === 0) {
    xCoord += 0.5;
  }
  let yCoord = 0;
  return {
    x: xCoord,
    y: yCoord,
  }
}


function onCellChange(event) {
  // Get the first changed touch point. We surely have one because we are listening to touchmove event, and surely a touch point have changed since the last event.
  const changedTouch = event.changedTouches[0];
  const elementUnderTouch = document.elementFromPoint(changedTouch.clientX, changedTouch.clientY);
  if (elementUnderTouch === selectedCell) {
    return;
  }
  if (elementUnderTouch === null || elementUnderTouch.getAttribute('role') !== 'gridcell') {
    return;
  }
  updateSelectedCell(elementUnderTouch);
  stopSoundPlayback();
  startSoundPlayback();
  event.stopPropagation();
}


function updateSelectedCell(cell: Element) {
  focusedRowIndex = parseInt(cell.getAttribute('row'));
  focusedColIndex = parseInt(cell.getAttribute('col'));
  if (selectedCell) {
    selectedCell.style.backgroundColor = '';
    selectedCell.style.border = '';
  }
  selectedCell = cell;
  selectedCell.style.backgroundColor = '#ffff4d';
  selectedCell.style.boarder = '1px solid #0099ff';
  if (dataHeaders.length != 0 && focusedRowIndex == 0) {
    return;
  }
  let soundCheckBox = (<HTMLInputElement>document.getElementById('soundOption'))
  if (soundCheckBox.checked) {
    startSoundPlayback();
  }
  if (!inReadAllMode) {
    reportText(false);
  }
}


function getUrlParam(variableName: string): string {
  const url = new URL(window.location.href);
  const params = url.searchParams;
  if (params.has(variableName) === false) {
    return '';
  }
  return params.get(variableName);
}


function parseData(dataString: string) {
  try {
    // parseWithHeaders and parseWithoutHeaders functions are found in app.ts file
    let combinedDataAndHeaders = parseWithHeaders(dataString);
    dataHeaders = combinedDataAndHeaders.dataHeaders;
    data = combinedDataAndHeaders.data;
  } catch (error) {
    data = parseWithoutHeaders(dataString);
  }
}


function getTextToReportOnArrows() {
  let xValue = data[focusedColIndex];
  let xValueText = String(xValue);
  if (xValue < 0) {
    xValue = Math.abs(xValue);
    xValueText = `Minus ${xValue}`;
  }
  let yValueText = '';
  if (dataHeaders.length == 0) {
    yValueText = `Position ${focusedColIndex + 1}`;
  } else {
    let headerText = dataHeaders[focusedColIndex];
    yValueText = `${headerText}, position ${focusedColIndex + 1}`;
  }
  let textToReport = '';
  let valueCheckBox = (<HTMLInputElement>document.getElementById('valueOption'));
  if (valueCheckBox.checked) {
    textToReport += `${xValueText}. `;
  }
  let positionCheckBox = (<HTMLInputElement>document.getElementById('positionOption'));
  if (positionCheckBox.checked) {
    textToReport += `${yValueText}. `;
  }
  let max = Math.max(...data);
  let minMaxCheckBox = (<HTMLInputElement>document.getElementById('minMaxOption'));
  if (!minMaxCheckBox.checked) {
    return textToReport;
  }
  let min = Math.min(...data);
  if (xValue === max) {
    return textToReport + 'Maximum value.';
  }
  if (xValue === min) {
    return textToReport + 'Minimum value. ';
  }
  return textToReport;
}


function getTextToReportOnSpace() {
  let graphValuesNum: number = data.length;
  let currentPosition: number = focusedColIndex + 1;
  let minValue: string = Math.min(...data).toFixed(2);
  let maxValue: string = Math.max(...data).toFixed(2);
  let average: string = getAverage(data).toFixed(2);
  let textToReport: string = getUrlParam('spaceInfo');
  if (textToReport !== '') {
    textToReport = textToReport.replace('$MIN$', minValue);
    textToReport = textToReport.replace('$MAX$', maxValue);
    textToReport = textToReport.replace('$AVERAGE$', average);
    return textToReport;
  }
  textToReport = `Position ${currentPosition} out of ${graphValuesNum}. Maximum value is ${maxValue}, minimum is ${minValue}, average is ${average}`;
  let xValue = data[focusedColIndex];
  let min: number = Math.min(...data);
  let max: number = Math.max(...data);
  if (xValue === max) {
    return 'Maximum value. ' + textToReport;
  }
  if (xValue === min) {
    return 'Minimum value. ' + textToReport;
  }
  return textToReport;
}


function getAverage(data: number[]): number {
  let sum: number = 0;
  for (let dataElement of data) {
    sum += dataElement;
  }
  return sum / data.length;
}


function reportText(onSpace: boolean) {
  let textToReport: string = '';
  if (onSpace) {
    textToReport = getTextToReportOnSpace();
  } else {
    textToReport = getTextToReportOnArrows();
  }
  speakText(textToReport);
}

function speakText(textToReport) {
  if (ttsName === 'noTts') {
    // Wait for 100 MS before updating the live region to have NVDA report the message on textarea focus event
    setTimeout(() => {
      document.getElementById('liveRegion').innerHTML = textToReport;
    }, 100);
  } else {
    speakTextWithTts(textToReport);
  }
}


function getGraphSummary() {
  let graphValuesNum: number = data.length;
  let minValue: string = Math.min(...data).toFixed(2);
  let maxValue: string = Math.max(...data).toFixed(2);
  let average: string = getAverage(data).toFixed(2);
  return `This graph has ${graphValuesNum} values. Maximum value is ${maxValue}, minimum is ${minValue}, average is ${average}.
During graph navigation, press space to hear this again.`;
}


function updateTtsCombo() {
  const ttsCombo: HTMLSelectElement = <HTMLSelectElement>document.getElementById('ttsVoice');
  for (let index = 0; index < ttsCombo.options.length; index++) {
    let currentTtsName = ttsCombo.options[index].getAttribute('data-name');
    if (currentTtsName === ttsName) {
      ttsCombo.selectedIndex = index;
      return;
    }
  }
  ttsCombo.selectedIndex = 0;
  ttsName = 'noTts';
  return;
}
