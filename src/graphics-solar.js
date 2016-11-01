/*
 * 159.360 Computer Graphics, Assignment II Part I
 * Sunday 18 August 2016
 * Original work by Dr Stephen Marsland 
 * Modified by Sam Hunt 14216618 
 * 
 * Abstracted some absolute transform values out into primitive model
 * Added sun to origin and moved Moon to Earth orbit
 * Added own-axis rotation to Earth and Sun, also alternative viewing settings
 */

// Model constants
var earthDistanceFromSun = 40;
var earthPoleAngle = 23.5;
var moonDistanceFromEarth = 10;

var sunRotationSpeed = 0.02;
var earthOrbitSpeed = 0.05;
var earthRotationSpeed = 0.1;
var moonOrbitSpeed = 0.15;




var gl;
var canvas;
var shaderProgram;

window.onload = function init() {
  // Get A WebGL context
  canvas = document.getElementById( "canvas" );

  gl = WebGLUtils.setupWebGL( canvas );
  if ( !gl ) { alert( "WebGL isn't available" ); }

        // setup GLSL program
        shaderProgram = initShaders( gl, "vertex-shader", "fragment-shader" );
        gl.useProgram(shaderProgram);

        defineAttributes();
        initBuffers();
        initTextures();

        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.enable(gl.DEPTH_TEST);

        render();
}

function defineAttributes() {
    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

    shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram, "aTextureCoord");
    gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);

    shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
    gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
    shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
    shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uSampler");
}

var moonTexture;
var earthTexture;
var sunTexture;

function initTextures() {
    moonTexture = gl.createTexture();
    moonTexture.image = new Image();
    moonTexture.image.onload = function () {
        bindTextures(moonTexture)
    }
    moonTexture.image.src = "../res/moon.gif";

    earthTexture = gl.createTexture();
    earthTexture.image = new Image();
    earthTexture.image.onload = function () {
        bindTextures(earthTexture)
    }
    earthTexture.image.src = "../res/earth.jpg";

    sunTexture = gl.createTexture();
    sunTexture.image = new Image();
    sunTexture.image.onload = function () {
        bindTextures(sunTexture)
    }
    sunTexture.image.src = "../res/sun.jpg";
}

function bindTextures(texture) {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
    gl.generateMipmap(gl.TEXTURE_2D);

    gl.bindTexture(gl.TEXTURE_2D, null);
}

var mvMatrix = mat4.create();
var mvMatrixStack = [];
var pMatrix = mat4.create();

function mvPushMatrix() {
    var copy = mat4.create();
    mat4.set(mvMatrix, copy);
    mvMatrixStack.push(copy);
}

function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
        throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

function setMatrixUniforms() {
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);

    var normalMatrix = mat3.create();
    mat4.toInverseMat3(mvMatrix, normalMatrix);
    mat3.transpose(normalMatrix);
    gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, normalMatrix);
}

function degToRad(degrees) {
    return degrees * Math.PI / 180;
}

var sunVertexPositionBuffer;
var sunVertexNormalBuffer;
var sunVertexTextureCoordBuffer;
var sunVertexIndexBuffer;

var earthVertexPositionBuffer;
var earthVertexNormalBuffer;
var earthVertexTextureCoordBuffer;
var earthVertexIndexBuffer;

var moonVertexPositionBuffer;
var moonVertexNormalBuffer;
var moonVertexTextureCoordBuffer;
var moonVertexIndexBuffer;

function initBuffers() {

    // Create the Earth

    var latitude = 30;
    var longitude = 30;
    var radius = 4;

    var vertexPositionData = [];
    var normalData = [];
    var textureCoordData = [];
    for (var latNumber=0; latNumber <= latitude; latNumber++) {
        var theta = latNumber * Math.PI / latitude;
        var sinTheta = Math.sin(theta);
        var cosTheta = Math.cos(theta);

        for (var longNumber=0; longNumber <= longitude; longNumber++) {
            var phi = longNumber * 2 * Math.PI / longitude;
            var sinPhi = Math.sin(phi);
            var cosPhi = Math.cos(phi);

            var x = cosPhi * sinTheta;
            var y = cosTheta;
            var z = sinPhi * sinTheta;
            var u = 1 - (longNumber / longitude);
            var v = 1 - (latNumber / latitude);

            normalData.push(x);
            normalData.push(y);
            normalData.push(z);
            textureCoordData.push(u);
            textureCoordData.push(v);
            vertexPositionData.push(radius * x);
            vertexPositionData.push(radius * y);
            vertexPositionData.push(radius * z);
        }
    }

    var indexData = [];
    for (var latNumber=0; latNumber < latitude; latNumber++) {
        for (var longNumber=0; longNumber < longitude; longNumber++) {
            var first = (latNumber * (longitude + 1)) + longNumber;
            var second = first + longitude + 1;
            indexData.push(first);
            indexData.push(second);
            indexData.push(first + 1);

            indexData.push(second);
            indexData.push(second + 1);
            indexData.push(first + 1);
        }
    }

    earthVertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, earthVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normalData), gl.STATIC_DRAW);
    earthVertexNormalBuffer.itemSize = 3;
    earthVertexNormalBuffer.numItems = normalData.length / 3;

    earthVertexTextureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, earthVertexTextureCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordData), gl.STATIC_DRAW);
    earthVertexTextureCoordBuffer.itemSize = 2;
    earthVertexTextureCoordBuffer.numItems = textureCoordData.length / 2;

    earthVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, earthVertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexPositionData), gl.STATIC_DRAW);
    earthVertexPositionBuffer.itemSize = 3;
    earthVertexPositionBuffer.numItems = vertexPositionData.length / 3;

    earthVertexIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, earthVertexIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexData), gl.STREAM_DRAW);
    earthVertexIndexBuffer.itemSize = 1;
    earthVertexIndexBuffer.numItems = indexData.length;


    // Create the moon

    var radius = 1.5;

    var vertexPositionData = [];
    var normalData = [];
    var textureCoordData = [];
    for (var latNumber=0; latNumber <= latitude; latNumber++) {
        var theta = latNumber * Math.PI / latitude;
        var sinTheta = Math.sin(theta);
        var cosTheta = Math.cos(theta);

        for (var longNumber=0; longNumber <= longitude; longNumber++) {
            var phi = longNumber * 2 * Math.PI / longitude;
            var sinPhi = Math.sin(phi);
            var cosPhi = Math.cos(phi);

            var x = cosPhi * sinTheta;
            var y = cosTheta;
            var z = sinPhi * sinTheta;
            var u = 1 - (longNumber / longitude);
            var v = 1 - (latNumber / latitude);

            normalData.push(x);
            normalData.push(y);
            normalData.push(z);
            textureCoordData.push(u);
            textureCoordData.push(v);
            vertexPositionData.push(radius * x);
            vertexPositionData.push(radius * y);
            vertexPositionData.push(radius * z);
        }
    }

    var indexData = [];
    for (var latNumber=0; latNumber < latitude; latNumber++) {
        for (var longNumber=0; longNumber < longitude; longNumber++) {
            var first = (latNumber * (longitude + 1)) + longNumber;
            var second = first + longitude + 1;
            indexData.push(first);
            indexData.push(second);
            indexData.push(first + 1);

            indexData.push(second);
            indexData.push(second + 1);
            indexData.push(first + 1);
        }
    }

    moonVertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, moonVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normalData), gl.STATIC_DRAW);
    moonVertexNormalBuffer.itemSize = 3;
    moonVertexNormalBuffer.numItems = normalData.length / 3;

    moonVertexTextureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, moonVertexTextureCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordData), gl.STATIC_DRAW);
    moonVertexTextureCoordBuffer.itemSize = 2;
    moonVertexTextureCoordBuffer.numItems = textureCoordData.length / 2;

    moonVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, moonVertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexPositionData), gl.STATIC_DRAW);
    moonVertexPositionBuffer.itemSize = 3;
    moonVertexPositionBuffer.numItems = vertexPositionData.length / 3;

    moonVertexIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, moonVertexIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexData), gl.STREAM_DRAW);
    moonVertexIndexBuffer.itemSize = 1;
    moonVertexIndexBuffer.numItems = indexData.length;


    // Create the Sun

    var radius = 8;

    var vertexPositionData = [];
    var normalData = [];
    var textureCoordData = [];
    for (var latNumber=0; latNumber <= latitude; latNumber++) {
        var theta = latNumber * Math.PI / latitude;
        var sinTheta = Math.sin(theta);
        var cosTheta = Math.cos(theta);

        for (var longNumber=0; longNumber <= longitude; longNumber++) {
            var phi = longNumber * 2 * Math.PI / longitude;
            var sinPhi = Math.sin(phi);
            var cosPhi = Math.cos(phi);

            var x = cosPhi * sinTheta;
            var y = cosTheta;
            var z = sinPhi * sinTheta;
            var u = 1 - (longNumber / longitude);
            var v = 1 - (latNumber / latitude);

            normalData.push(x);
            normalData.push(y);
            normalData.push(z);
            textureCoordData.push(u);
            textureCoordData.push(v);
            vertexPositionData.push(radius * x);
            vertexPositionData.push(radius * y);
            vertexPositionData.push(radius * z);
        }
    }

    var indexData = [];
    for (var latNumber=0; latNumber < latitude; latNumber++) {
        for (var longNumber=0; longNumber < longitude; longNumber++) {
            var first = (latNumber * (longitude + 1)) + longNumber;
            var second = first + longitude + 1;
            indexData.push(first);
            indexData.push(second);
            indexData.push(first + 1);

            indexData.push(second);
            indexData.push(second + 1);
            indexData.push(first + 1);
        }
    }

    sunVertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sunVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normalData), gl.STATIC_DRAW);
    sunVertexNormalBuffer.itemSize = 3;
    sunVertexNormalBuffer.numItems = normalData.length / 3;

    sunVertexTextureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sunVertexTextureCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordData), gl.STATIC_DRAW);
    sunVertexTextureCoordBuffer.itemSize = 2;
    sunVertexTextureCoordBuffer.numItems = textureCoordData.length / 2;

    sunVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sunVertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexPositionData), gl.STATIC_DRAW);
    sunVertexPositionBuffer.itemSize = 3;
    sunVertexPositionBuffer.numItems = vertexPositionData.length / 3;

    sunVertexIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sunVertexIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexData), gl.STREAM_DRAW);
    sunVertexIndexBuffer.itemSize = 1;
    sunVertexIndexBuffer.numItems = indexData.length;
}



// Model variables
var sunRotationCurrentAngle = 0;
var earthRotationCurrentAngle = 0;
var earthOrbitCurrentAngle = 0;
var moonOrbitCurrentAngle = 0;

function updateModel(elapsedTime) {
    moonOrbitCurrentAngle += moonOrbitSpeed * elapsedTime;
    earthOrbitCurrentAngle += earthOrbitSpeed * elapsedTime;
    earthRotationCurrentAngle += earthRotationSpeed * elapsedTime;
    sunRotationCurrentAngle += sunRotationSpeed * elapsedTime;
}


// View variables
var viewType = "sun";
var viewZoom = 0.5;
var viewRotationX = 0;
var viewRotationY = 0;
var viewRotationZ = 0;

function updateView() {
    viewZoom = document.getElementById("zoomRange").value / 100.0;
    viewRotationX = document.getElementById("rotRangeX").value;
    viewRotationY = document.getElementById("rotRangeY").value;
    viewRotationZ = document.getElementById("rotRangeZ").value;
}

function setDefaultView() {
    document.getElementById("zoomRange").value = 50;
    document.getElementById("rotRangeX").value = 180;
    document.getElementById("rotRangeY").value = 180;
    document.getElementById("rotRangeZ").value = 180;

    if (document.getElementById("radioEarth").checked === true) {
        viewType='earth'
    } 
    else if (document.getElementById("radioMoon").checked === true) {
        viewType='moon'
    } 
    else if (document.getElementById("radioEfM").checked === true) {
        viewType='earth-from-moon'
        // zoom is pretty much arbitrary; ideally you'd calculate this from the Moon's radius and distance from Earth
        document.getElementById("zoomRange").value = 66;
    } 
    else if (document.getElementById("radioMfE").checked === true) {
        viewType='moon'
        // zoom is pretty much arbitrary; ideally you'd calculate this from the Earth's radius and distance from Earth
        document.getElementById("zoomRange").value = 76;
        document.getElementById("rotRangeY").value = 90;
    } 
    else {
        viewType='sun'
    }
}

function drawScene() {
    gl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Set up the projection
    mat4.perspective(45, canvas.clientWidth / canvas.clientHeight, 0.1, 500.0, pMatrix);
    mat4.identity(mvMatrix);

    // Use the correct perspective settings based on all the options
    switch(viewType) {
        case "earth": {
            // Apply the user-selected zoom/rotation settings
            mat4.translate(mvMatrix, [0, 0, -50 * (1-viewZoom)]);
            mat4.rotate(mvMatrix, degToRad(viewRotationX), [1, 0, 0]);
            mat4.rotate(mvMatrix, degToRad(viewRotationY), [0, 1, 0]);
            mat4.rotate(mvMatrix, degToRad(viewRotationZ), [0, 0, 1]);
            
            // Move the system so that Earth appears at the origin
            mat4.translate(mvMatrix, [-earthDistanceFromSun, 0, 0]);
            mat4.rotate(mvMatrix, degToRad(360-earthOrbitCurrentAngle), [0, 1, 0]);
            break;
        }
        case "moon": {
            // Apply the user-selected zoom/rotation settings
            mat4.translate(mvMatrix, [0, 0, -25 * (1-viewZoom)]);
            mat4.rotate(mvMatrix, degToRad(viewRotationX), [1, 0, 0]);
            mat4.rotate(mvMatrix, degToRad(viewRotationY), [0, 1, 0]);
            mat4.rotate(mvMatrix, degToRad(viewRotationZ), [0, 0, 1]);

            // Move the system so that the Moon appears at the origin
            mat4.translate(mvMatrix, [-moonDistanceFromEarth, 0, 0]);
            mat4.rotate(mvMatrix, degToRad(360-moonOrbitCurrentAngle), [0, 1, 0]);

            // Move the system so that Earth appears at the origin
            mat4.translate(mvMatrix, [-earthDistanceFromSun, 0, 0]);
            mat4.rotate(mvMatrix, degToRad(360-earthOrbitCurrentAngle), [0, 1, 0]);
            break;
        }
        case "earth-from-moon": {

            // Apply the user-selected zoom/rotation settings
            mat4.translate(mvMatrix, [0, 0, -25 * (1-viewZoom)]);
            mat4.rotate(mvMatrix, degToRad(viewRotationX), [1, 0, 0]);
            mat4.rotate(mvMatrix, degToRad(viewRotationY), [0, 1, 0]);
            mat4.rotate(mvMatrix, degToRad(viewRotationZ), [0, 0, 1]);

            // Rotate the view of earth so it's from the moon
            mat4.rotate(mvMatrix, degToRad(270-moonOrbitCurrentAngle), [0, 1, 0]);

            // Move the system so that Earth appears at the origin
            mat4.translate(mvMatrix, [-earthDistanceFromSun, 0, 0]);
            mat4.rotate(mvMatrix, degToRad(360-earthOrbitCurrentAngle), [0, 1, 0]);
            break;
        }
        case "sun": 
        default: 
        {
            // Apply the user-selected zoom/rotation settings
            mat4.translate(mvMatrix, [0, 0, -170 * (1-viewZoom)]);
            mat4.rotate(mvMatrix, degToRad(viewRotationX), [1, 0, 0]);
            mat4.rotate(mvMatrix, degToRad(viewRotationY), [0, 1, 0]);
            mat4.rotate(mvMatrix, degToRad(viewRotationZ), [0, 0, 1]);

            // Nothing else since sun is at the origin by default
            break;
        }
    }

    // Sun
    mvPushMatrix();

    // Rotate the sun around on its axis
    mat4.rotate(mvMatrix, degToRad(sunRotationCurrentAngle), [0, 1, 0]);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sunTexture);
    gl.uniform1i(shaderProgram.samplerUniform, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, sunVertexPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, sunVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, sunVertexTextureCoordBuffer);
    gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, sunVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, sunVertexNormalBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, sunVertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sunVertexIndexBuffer);
    setMatrixUniforms();
    gl.drawElements(gl.TRIANGLES, sunVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    mvPopMatrix();


    // Earth
    mvPushMatrix();

    // Rotate the Earth around the Sun
    mat4.rotate(mvMatrix, degToRad(earthOrbitCurrentAngle), [0, 1, 0]);
    // Move the Earth away from the sun
    mat4.translate(mvMatrix, [earthDistanceFromSun, 0, 0]);
    // Rotate the Earth around its axis
    mat4.rotate(mvMatrix, degToRad(earthPoleAngle), [1, 0, 0]);
    mat4.rotate(mvMatrix, degToRad(earthRotationCurrentAngle), [0, 1, 0]);
    
    
    
    gl.bindBuffer(gl.ARRAY_BUFFER, earthVertexPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, earthVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, earthVertexNormalBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, earthVertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, earthVertexTextureCoordBuffer);
    gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, earthVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, earthTexture);
    gl.uniform1i(shaderProgram.samplerUniform, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, earthVertexIndexBuffer);
    setMatrixUniforms();
    gl.drawElements(gl.TRIANGLES, earthVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    mvPopMatrix();


    // Moon
    mvPushMatrix();

    // Account for earth orbit
    mat4.rotate(mvMatrix, degToRad(earthOrbitCurrentAngle), [0, 1, 0]);
    // Account for earth distance to the sun
    mat4.translate(mvMatrix, [earthDistanceFromSun, 0, 0]);
    // rotate moon around earth
    mat4.rotate(mvMatrix, degToRad(moonOrbitCurrentAngle), [0, 1, 0]);
    mat4.translate(mvMatrix, [moonDistanceFromEarth, 0, 0]);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, moonTexture);
    gl.uniform1i(shaderProgram.samplerUniform, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, moonVertexPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, moonVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, moonVertexTextureCoordBuffer);
    gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, moonVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, moonVertexNormalBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, moonVertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, moonVertexIndexBuffer);
    setMatrixUniforms();
    gl.drawElements(gl.TRIANGLES, moonVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    mvPopMatrix();

   
}


// Independent vars for calculating average frame rate
var numFramesToAverage = 16;
var frameTimeHistory = [];
var frameTimeIndex = 0;
var totalTimeForFrames = 0;
var fpsElement = document.getElementById("fps");
var then = Date.now() / 1000;  // get time in seconds

var lastTime = 0;

function render() {

    // Update the average framerate calculation and display
    var now = Date.now() / 1000;
    var elapsedTime = now - then;
    then = now;
    totalTimeForFrames += elapsedTime - (frameTimeHistory[frameTimeIndex] || 0);
    frameTimeHistory[frameTimeIndex] = elapsedTime;
    frameTimeIndex = (frameTimeIndex + 1) % numFramesToAverage;
    var averageElapsedTime = totalTimeForFrames / numFramesToAverage;
    fpsElement.innerText = (1 / averageElapsedTime).toFixed(0);  

    // Do the actual rendering stuff
    var timeNow = new Date().getTime();
    drawScene();
    if (lastTime != 0) {
        var elapsed = timeNow - lastTime;

        // Update the underlying model as entities rotate/orbit
        updateView();
        updateModel(elapsed);
    }
    lastTime = timeNow;
    requestAnimFrame(render)
}


