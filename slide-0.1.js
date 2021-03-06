function slide(currentElt, newElts, options) {

  var slideCanvasElt, 
    width, 
    height, 
    speed, 
    dragStartPos,
    dragPos, 
    currentPos, 
    previousPos = false,
    currentDir = false,
    speedTracker, 
    bezierTimer = false,
    center,
    thresholdOrientationDistance = 20,
    borderProximityDistance = 20,
    orientation = false,
    placedElts = [],
    positions = {},
    enabled = true,
    dragging = false,
    firstDrag = true,
    TOP = 0, RIGHT = 1, BOTTOM = 2, LEFT = 3, X = 0, Y = 1;


  var run = function() {

    options = extend({
      onBegin: false, // triggered when a switch is started
      onComplete: false, // triggered when a switch is completed
      switchDelay: 300, // defines the time it takes to switch in milliseconds
    }, options);

    addEvent(document.getElementsByTagName('body')[0],'touchmove', function(event) {
      event.preventDefault();
    }, false);

    addSlideCanvas(); 

    addEvent(window, 'resize', resizeAndPositionElements);

    addDragEvents();

    return triggerSwitch;

  };

  var triggerSwitch = function(direction) {

    if ((typeof newElts[direction] == 'undefined') || !enabled) return;

    for (posIndex in positions) {
      if (positions[posIndex].label == direction) {
        currentDir = posIndex;
        orientation = (posIndex%2==0)?V:X;
        break;
      }
    };

    currentPos = 0;

    appendNewElt(currentDir);

    release(true);

  };

  var onDragBegin = function(e) {

    if (!enabled) return;

    dragging = true;

    if (typeof e.preventDefault !== 'undefined') e.preventDefault(); //android 2.1 bug - Issue 5491

    currentDir = false;

    if (bezierTimer) clearInterval(bezierTimer);

    dragStartPos = whereAt(e);

    previousPos = dragPos = dragStartPos.slice();
    
    speedTracker = setInterval(function(){
      speed = Math.abs(dragPos[0] - previousPos[0]) + Math.abs(dragPos[1] - previousPos[1]);
      previousPos = dragPos.slice();
    }, 100);

    addEvent(slideCanvasElt, 'mousemove', onDrag);
    addEvent(slideCanvasElt, 'touchmove', onDrag);

  };

  var onDragEnd = function(e) {

    if (!enabled) return;

    release(false);

  };

  var onDrag = function(e) {

    if (!dragging) return;

    dragPos = whereAt(e);

    if (speed > 10 && isNearBorder(dragPos)) return release(false);

    if (orientation===false) return estimateOrientation();

    currentPos = Math.floor(dragPos[orientation] - dragStartPos[orientation]);
    currentDir = (orientation==X)?(currentPos>0?LEFT:RIGHT):(currentPos>0?TOP:BOTTOM);

    if (typeof newElts[['top', 'right', 'bottom', 'left'][currentDir]] == 'undefined') {

      // there is no element in said direction, limit drag
      if (Math.abs(currentPos) > width*0.1) 
        currentPos = (contains([BOTTOM,RIGHT], currentDir)?-1:1)*(orientation==Y?height:width)*0.1;

    } else {
      if (!contains(placedElts, currentDir)) appendNewElt(currentDir);
    }

    slideCanvasElt.style[orientation==Y?'top':'left'] = -(orientation==Y?height:width)+currentPos + 'px';
    
  };

  var release = function(forceSwitch) {

    var destinationPos = 0;
    var doSwitch = false;

    if (!dragging && !forceSwitch) return;
    dragging = false;

    removeDragEvents();
    removeEvent(slideCanvasElt, 'mousemove', onDrag);
    removeEvent(slideCanvasElt, 'touchmove', onDrag);

    if (!forceSwitch) if ( (speed>10) && (typeof newElts[positions[currentDir].label] != 'undefined') && (Math.abs(currentPos) > 0.3*(orientation==X?width:height))) {
      doSwitch = true;
    };

    if (doSwitch || forceSwitch) destinationPos = -positions[currentDir][orientation==X?'left':'top'] + (orientation==X?width:height);


    if (speedTracker) {
      clearInterval(speedTracker);
      speed = false;
    };

    enabled = false;

    if (doSwitch || forceSwitch) if (options.onBegin) options.onBegin();
    
    bezierTimer = updateBezierPos(options.switchDelay, currentPos, destinationPos, function(pos){

      slideCanvasElt.style[orientation==X?'left':'top'] = -(orientation==Y?height:width) + pos + 'px';

    }, function(){

      if (forceSwitch || doSwitch) {
        set(newElts[positions[currentDir].label]);
      } else {
        addDragEvents();
        orientation = false;
        currentDir = false;
        enabled = true;
      }
      
    });

  };

  var isNearBorder = function(pointerPos) {
    return ((pointerPos[0] < borderProximityDistance) || (pointerPos[0] > width - borderProximityDistance) || (pointerPos[1] < borderProximityDistance) || (pointerPos[1] > height - borderProximityDistance))?true:false;
  };

  var addDragEvents = function(){
    addEvent(slideCanvasElt, 'mousedown', onDragBegin);
    addEvent(slideCanvasElt, 'touchstart', onDragBegin);
    addEvent(slideCanvasElt, 'mouseup', onDragEnd);
    addEvent(slideCanvasElt, 'touchend', onDragEnd);  
  };

  var removeDragEvents = function() {
    removeEvent(slideCanvasElt, 'mousedown', onDragBegin);
    removeEvent(slideCanvasElt, 'touchstart', onDragBegin);
    removeEvent(slideCanvasElt, 'mouseup', onDragEnd);
    removeEvent(slideCanvasElt, 'touchend', onDragEnd);
  };

    

  var estimateOrientation = function() {

    // find out orientation from ref point and current position
    var xDis = dragPos[X]-dragStartPos[X];
    var yDis = dragPos[Y]-dragStartPos[Y];

    if ((xDis*xDis) + (yDis*yDis) > thresholdOrientationDistance*thresholdOrientationDistance)
      orientation = (Math.abs(xDis) > Math.abs(yDis))?X:Y;
  };

  var appendNewElt = function(position){

    applyStyle(newElts[positions[position].label], {
      display: 'block',
      position: 'absolute',
      width: width + 'px',
      height: height + 'px',
      top: positions[position].top + 'px',
      left: positions[position].left + 'px'
    });

    slideCanvasElt.appendChild(newElts[positions[position].label]);

    placedElts.push(position);

  };


  var addSlideCanvas = function() {

    // create slide canvas element
    slideCanvasElt = document.createElement('div');
    slideCanvasElt.style.position = 'absolute';

    // format parent
    currentElt.parentNode.style.position = 'relative';
    currentElt.parentNode.style.overflow = 'hidden';

    // shove in elements
    currentElt.parentNode.appendChild(slideCanvasElt);
    slideCanvasElt.appendChild(currentElt);

    currentElt.style.position = 'absolute';

    resizeAndPositionElements();
    
  };

  var resizeAndPositionElements = function() {

    // find out about height, width and center
    width = slideCanvasElt.parentNode.offsetWidth;
    height = slideCanvasElt.parentNode.offsetHeight;
    center = [Math.floor(height/3), Math.floor(width/3)];

    positions[TOP] = { top: 0, left: width, label: 'top' };
    positions[BOTTOM] = { top: 2*height, left: width, label: 'bottom' };
    positions[RIGHT] = { top: height, left: 2*width, label: 'right' };
    positions[LEFT] = { top: height, left: 0, label: 'left' };

    // resize and position slide canvas
    applyStyle(slideCanvasElt, {
      width: 3*width + 'px',
      height: 3*height + 'px',
      position: 'absolute',
      left: '-' + width + 'px',
      top: '-' + height + 'px'
    });

    // current element
    applyStyle(currentElt, {
      height: height + 'px',
      width: width + 'px',
      top: height + 'px',
      left: width + 'px',
    });


    // any other placed neighbor
    for (var i=0; i<placedElts.length; i++) {

      applyStyle(newElts[positions[placedElts[i]].label], {
        height: height + 'px',
        width: width + 'px',
        top: positions[placedElts[i]].top + 'px',
        left: positions[placedElts[i]].left + 'px'
      });

    }

  };

  var set = function(newElt) {

    slideCanvasElt.parentNode.appendChild(newElt);
    slideCanvasElt.parentNode.removeChild(slideCanvasElt);

    removeEvent(window, 'resize', resizeAndPositionElements);

    applyStyle(newElt, {
      position: 'relative',
      top: '0',
      left: '0'
    });

    if (options.onComplete) options.onComplete(newElt);

  };

  var applyStyle = function(elem, style) {
    for (index in style) {
      elem.style[index] = style[index];
    }
  };

  var updateBezierPos = function(totalTime, startX, endX, callback, complete) {
  
    var interval = 20,
      step = interval/totalTime,
      t = 0,
      x1 = .3,
      x2 = .5,
      timer,
      currentX,
      distance = endX - startX;

    timer = setInterval(function(){

      callback(Math.floor(startX + (t * (3*x1 + t * (3 * (x2 - x1) - 3*x1 + t * (1 - 3 * x1 - (3 * (x2 - x1) - 3 * x1)))))*distance));

      t += step;

      if (t>=1) {
        clearInterval(timer);
        callback(endX);
        complete();
      }

    }, interval);

    return timer;

  };

  if (typeof extend == 'undefined') var extend = function() {
    for(var i=1; i<arguments.length; i++)
        for(var key in arguments[i])
            if(arguments[i].hasOwnProperty(key))
                arguments[0][key] = arguments[i][key];
    return arguments[0];
  };

  if (typeof addEvent == 'undefined') var addEvent = function(elem, type, eventHandle) {
    if (elem == null || elem == undefined) return;
    if ( elem.addEventListener ) {
        elem.addEventListener( type, eventHandle, false);
    } else if ( elem.attachEvent ) {
        elem.attachEvent( "on" + type, eventHandle );
    } else {
        elem["on"+type]=eventHandle;
    }
  };

  if (typeof removeEvent == 'undefined') var removeEvent = function(elem, type, eventHandle) {
    if (elem == null || elem == undefined) return;
    if ( elem.addEventListener ) {
      elem.removeEventListener(type, eventHandle, false);
    } else if ( elem.detachEvent ) {
      elem.detachEvent("on" + type, eventHandle);
    } else {
      elem["on"+type]=null;
    }
  };

  if (typeof whereAt == 'undefined') var whereAt = (function(){
    if(window.pageXOffset!= undefined){
        return function(ev){
            return [(typeof ev.clientX=='undefined'?ev.touches[0].pageX:ev.clientX)+window.pageXOffset,
            (typeof ev.clientY=='undefined'?ev.touches[0].pageY:ev.clientY)+window.pageYOffset];
        }
    }
    else return function(){
        var ev= window.event,
        d= document.documentElement, b= document.body;
        return [ev.clientX+d.scrollLeft+ b.scrollLeft,
        ev.clientY+d.scrollTop+ b.scrollTop];
    }
  })();

  if (typeof contains == 'undefined') var contains = function(a, obj) {
    var i = a.length;
    while (i--) {
       if (a[i] === obj) {
           return true;
       }
    }
    return false;
  };

  return run();

};
