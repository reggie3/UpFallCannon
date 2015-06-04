document.addEventListener('DOMContentLoaded', function () {
    var frameCounter = 0;
    var clock, stats, physicsStats, container, renderer, scene, world, camera, hudCamera, hudScene, canvas;
    var windowHalfX = window.innerWidth / 2;
    var windowHalfY = window.innerHeight / 2;
    var shapes = [];
    var wallData = {
        walls: {
            ceiling: {mesh: undefined, body: undefined},
            rightWall: {mesh: undefined, body: undefined},
            leftWall: {mesh: undefined, body: undefined}
        },
        width: 1,
        ceilingWidth: undefined,
        color: 0x7777ee
    };
    var controls = {
        buttons: {
            left: {mesh: undefined},
            right: {mesh: undefined},
            leftUp: {mesh: undefined},
            rightUp: {mesh: undefined}
        },
        backgroundColor: (0xFFFFFF),
        unpressedColor: {r:222/255, g:0/255, b:255/255},
        pressedColor : {r:255/255, g:0/255, b:125/255},
        upUnpressedColor: {r:222/255, g:0/255, b:255/255},
        upPressedColor : {r:255/255, g:0/255, b:125/255},
        leftButtonPressed: false,
        rightButtonPressed: false,
        bolUpButtonPressed: false,
        tweenSpeed: 150
    };
    var width, height;
    var boxWidth, boxHeight, boxDepth;
    var numBoxesWide = 12;
    var timeStep = 1 / 60;
    var blockInterval = 6;
    var timeSinceLastBlock;

    //setup options
    var usePerspective = true;

    init();

    function init() {
        setupOptions();
        wallData.ceilingWidth = boxWidth * (numBoxesWide+1);
        setupContainer();
        setupRenderer();

        scene = new THREE.Scene();
        hudScene = new THREE.Scene();
        world = new CANNON.World();
        world.gravity.set(0, 10, 0);
        world.broadphase = new CANNON.NaiveBroadphase();
        ShapeProto.world = world;
        setupCamera();
        setupHUDCamera();
        setupStats();
        setupLights();
        addEventListeners();

        clock = new THREE.Clock();
        //start the animation loop
        setupWalls();
        setupControls();
        addEventListeners();
        animate();
    }

    function setupOptions() {
        //setup the options
        if (usePerspective === true) {
            boxWidth = 1;
            boxHeight = 1;
            boxDepth = 1;
        }
        else {
            boxWidth = width / 10;
            boxHeight = width / 10;
            boxDepth = width / 10;
        }

    }

    //setup container
    function setupContainer() {
        container = document.createElement("div");
        document.body.appendChild(container);
    }

    function setupRenderer() {
        //renderer = new THREE.WebGLRenderer( { antialias: true, devicePixelRatio: 1 } );
        renderer = new THREE.WebGLRenderer({antialias: false, devicePixelRatio: 1});
        renderer.autoClearColor = false;
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMapEnabled = true;
        renderer.shadowMapSoft = true;
        renderer.shadowMapType = THREE.PCFShadowMap;
        canvas = renderer.domElement;
        canvas.id = "canvas";

        container.appendChild(canvas);
    }

    function setupCamera() {
        //camera = new THREE.OrthographicCamera(
        //      width / -2, width / 2, height / 2, height / -2, -100, 1000);
        var aspectRatio = window.innerWidth / window.innerHeight;
        camera = new THREE.PerspectiveCamera(
            80, aspectRatio, 1, 1000);
        camera.position.set(0, 0, 15);
        //camera.lookAt( scene.position );

        var vFOV = camera.fov * Math.PI / 180;        // convert vertical fov to radians
        height = 2 * Math.tan(vFOV / 2) * camera.position.z; // visible height
        width = .75 * height * aspectRatio;

        //console.log("width | height : " + width + " | " + height);
        //boxWidth = boxHeight = boxDepth = width / numBoxesWide;
        //console.log("width / numBoxesWide " + width / numBoxesWide);
        //console.log("box dim: " + boxWidth + ", " + boxHeight + ", " + boxDepth);

        scene.add(camera);
    }

    function setupHUDCamera() {
        hudCamera = new THREE.OrthographicCamera(
            width / -2, width / 2, height / 2, height / -2, -100, 1000);


        //console.log("width | height : " + width + " | " + height);
        //boxWidth = boxHeight = boxDepth = width / numBoxesWide;
        //console.log("width / numBoxesWide " + width / numBoxesWide);
        //console.log("box dim: " + boxWidth + ", " + boxHeight + ", " + boxDepth);

        hudScene.add(hudCamera);
    }

    function setupStats() {
        stats = new Stats();
        stats.domElement.style.position = 'absolute';
        stats.domElement.style.bottom = '0px';
        container.appendChild(stats.domElement);

        physicsStats = new Stats();
        physicsStats.domElement.style.position = 'absolute';
        physicsStats.domElement.style.bottom = '50px';
        physicsStats.domElement.style.zIndex = 100;
        container.appendChild(physicsStats.domElement);
    }

    function animate() {
        var dt = clock.getDelta();

        timeSinceLastBlock += dt;
        //only create a new shape if the first one has reached .25 of the screen
        //if ((!timeSinceLastBlock) || (timeSinceLastBlock > blockInterval)) {
        //    createFallingShape();
        //    timeSinceLastBlock = 0;
        //}

        if(ShapeProto.bolReadyForNextShape){
            createFallingShape();
            timeSinceLastBlock = 0;
        }


        //loop through the shapes and update
        for (var key in ShapeProto.shapes) {
            if (ShapeProto.shapes.hasOwnProperty(key)) {
                var shape = ShapeProto.shapes[key];
                shape.update(dt);
            }
        }

        render();

        world.step(timeStep);
        //setTimeout(ShapeProto.removeDeadBlocks(numBoxesWide, fieldArray, scene), 1000);
        ShapeProto.removeDeadBlocks(scene, world); //
        //ShapeProto.setAllBlocksToUnevaluated(numBoxesWide);
        requestAnimationFrame(animate);
    }

    function render() {
        TWEEN.update();
        renderer.render(scene, camera);
        renderer.render(hudScene, hudCamera);
        stats.update();
        frameCounter++;
    }

    function onWindowResize() {
        windowHalfX = window.innerWidth / 2;
        windowHalfY = window.innerHeight / 2;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function setupLights() {
        var ambientLight = new THREE.AmbientLight(0x404040); // soft white light
        scene.add(ambientLight);

        var pointLight = new THREE.PointLight(0xff0000, 1, 100);
        pointLight.position.set(0, 0, 20);
        scene.add(pointLight);

        var dirLight = new THREE.DirectionalLight(0xffffff);
        // add shadow properties to light
        dirLight.castShadow = true;
        dirLight.shadowMapWidth = 2048;
        dirLight.shadowMapHeight = 2048;
        dirLight.shadowDarkness = 0.5;
        dirLight.shadowCameraNear = 5;
        dirLight.shadowCameraFar = 100;
        //light.shadowBias = 0.00001;
        // If this is too low, expect bright lines around objects
        dirLight.shadowBias = 0.0015;
        // This rectangle is the only place you will get shadows
        dirLight.shadowCameraRight = 20;
        dirLight.shadowCameraLeft = -20;
        dirLight.shadowCameraTop = 20;
        dirLight.shadowCameraBottom = -20;
        // For debugging
        //light.shadowCameraVisible = true;
        dirLight.position.set(15, 15, 20);
        scene.add(dirLight);

        var hudAmbientLight = new THREE.AmbientLight(0x404040); // soft white light
        hudScene.add(hudAmbientLight);
    }



    function setupWalls() {
        var fieldWidth = wallData.ceilingWidth;
        var wallMaterial = new THREE.MeshPhongMaterial({color: wallData.color});

        wallData.walls.ceiling.mesh = new THREE.Mesh(new THREE.BoxGeometry(fieldWidth,
                wallData.width,  wallData.width),
            wallMaterial);
        wallData.walls.ceiling.name = "ceiling";

        wallData.walls.rightWall.mesh = new THREE.Mesh(new THREE.BoxGeometry( wallData.width,
                height, wallData.width),
            wallMaterial);
        wallData.walls.rightWall.name = "rightWall";

        wallData.walls.leftWall.mesh = new THREE.Mesh(new THREE.BoxGeometry(wallData.width,
                height, wallData.width),
            wallMaterial);
        wallData.walls.leftWall.name = "leftWall";


        scene.add(wallData.walls.ceiling.mesh);
        scene.add(wallData.walls.leftWall.mesh);
        scene.add(wallData.walls.rightWall.mesh)

        // Create a slippery material (friction coefficient = 0.0)
        var slipperyMaterial = new CANNON.Material("slipperyMaterial");
        // The ContactMaterial defines what happens when two materials meet.
        // In this case we want friction coefficient = 0.0 when the slippery material touches ground.
        var boxMaterial = new CANNON.Material("boxMaterial");
        var slipperyWallContactMaterial = new CANNON.ContactMaterial(boxMaterial, slipperyMaterial, {
            friction: 0
        });
        // We must add the contact materials to the world
        world.addContactMaterial(slipperyWallContactMaterial);

        //create the physics bodies for the wallData
        //loop through the shapes and update
        for (var key in wallData.walls) {
            if (wallData.walls.hasOwnProperty(key)) {
                var wall = wallData.walls[key];
                wall.body = CannonHelper.createStaticBox(wall.mesh);
                wall.body.material = slipperyWallContactMaterial;
                world.add(wall.body);

            }
        }
        wallData.walls.ceiling.body.position.y = height / 2 - wallData.width/2;
        wallData.walls.rightWall.body.position.x = fieldWidth / 2 - .5;
        wallData.walls.leftWall.body.position.x = fieldWidth / -2 - .5;

        wallData.walls.ceiling.mesh.position.copy(wallData.walls.ceiling.body.position);
        wallData.walls.ceiling.mesh.quaternion.copy(wallData.walls.ceiling.body.quaternion);

        wallData.walls.rightWall.mesh.position.copy(wallData.walls.rightWall.body.position);
        wallData.walls.rightWall.mesh.quaternion.copy(wallData.walls.rightWall.body.quaternion);

        wallData.walls.leftWall.mesh.position.copy(wallData.walls.leftWall.body.position);
        wallData.walls.leftWall.mesh.quaternion.copy(wallData.walls.leftWall.body.quaternion);

    }

    function setupControls() {

        var horOffset = 4;
        var backgroundRad = width*.20;
        var buttonRad =1;
        var buttonOffSet = {x:.85, y:.25, z:1.1};
        var upButtonOffSet = {x:.65, y:.60, z:1.1};
        //var sideMovementButtonAngle = 25

        var color = new THREE.Color().setRGB(
            controls.unpressedColor.r,
            controls.unpressedColor.g,
            controls.unpressedColor.b
        );
        var upUnpressedColor = new THREE.Color().setRGB(
            controls.upUnpressedColor.r,
            controls.upUnpressedColor.g,
            controls.upUnpressedColor.b
        );
        var backgroundMat = new THREE.MeshLambertMaterial({color:controls.backgroundColor});
        var leftBackgroundMesh, rightBackgroundMesh;

        leftBackgroundMesh = new THREE.Mesh(new THREE.CircleGeometry(backgroundRad, 32),
            backgroundMat);

        rightBackgroundMesh = new THREE.Mesh(new THREE.CircleGeometry(backgroundRad, 32),
            backgroundMat);

        rightBackgroundMesh.position.x = wallData.walls.rightWall.mesh.position.x + horOffset;
        leftBackgroundMesh.position.x = wallData.walls.leftWall.mesh.position.x - horOffset;

        rightBackgroundMesh.position.y = -height/2;
        leftBackgroundMesh.position.y = -height/2;

        hudScene.add(leftBackgroundMesh);
        hudScene.add(rightBackgroundMesh);

        var leftButMat = new THREE.MeshLambertMaterial({color: color});
        var rightButMat = new THREE.MeshLambertMaterial({color: color});
        var upButMat = new THREE.MeshBasicMaterial({color: upUnpressedColor});

        controls.buttons.right.mesh = new THREE.Mesh(new THREE.SphereGeometry(buttonRad, 32, 32),
            rightButMat);
        controls.buttons.left.mesh = new THREE.Mesh(new THREE.SphereGeometry(buttonRad, 32, 32),
            leftButMat);

        controls.buttons.leftUp.mesh = new THREE.Mesh(new THREE.SphereGeometry(buttonRad, 32, 32),
            upButMat);
        controls.buttons.rightUp.mesh = new THREE.Mesh(new THREE.SphereGeometry(buttonRad, 32, 32),
            upButMat);

        controls.buttons.left.mesh.position.copy(leftBackgroundMesh.position);
        controls.buttons.right.mesh.position.copy(rightBackgroundMesh.position);
        controls.buttons.leftUp.mesh.position.copy(leftBackgroundMesh.position);
        controls.buttons.rightUp.mesh.position.copy(rightBackgroundMesh.position);

        controls.buttons.left.mesh.position.x +=  backgroundRad *buttonOffSet.x; //wallData.leftWall.mesh.position.x + horOffset;
        controls.buttons.right.mesh.position.x -=  backgroundRad *buttonOffSet.x; //wallData.rightWall.mesh.position.x - horOffset;
        controls.buttons.right.mesh.position.y +=  backgroundRad *buttonOffSet.y;
        controls.buttons.left.mesh.position.y +=  backgroundRad *buttonOffSet.y;
        controls.buttons.right.mesh.position.z += backgroundRad * buttonOffSet.z;
        controls.buttons.left.mesh.position.z += backgroundRad * buttonOffSet.z;
        controls.buttons.left.mesh.name = "leftButton";
        controls.buttons.right.mesh.name = "rightButton";

        controls.buttons.leftUp.mesh.position.x +=  backgroundRad *upButtonOffSet.x; //wallData.leftWall.mesh.position.x + horOffset;
        controls.buttons.rightUp.mesh.position.x -=  backgroundRad *upButtonOffSet.x; //wallData.rightWall.mesh.position.x - horOffset;
        controls.buttons.rightUp.mesh.position.y +=  backgroundRad *upButtonOffSet.y;
        controls.buttons.leftUp.mesh.position.y +=  backgroundRad *upButtonOffSet.y;
        controls.buttons.rightUp.mesh.position.z += backgroundRad * upButtonOffSet.z;
        controls.buttons.leftUp.mesh.position.z += backgroundRad * upButtonOffSet.z;
        controls.buttons.leftUp.mesh.name = "leftUp";
        controls.buttons.rightUp.mesh.name = "rightUp";

        for (var key in controls.buttons) {
            if (controls.buttons.hasOwnProperty(key)) {
                var button = controls.buttons[key];
                hudScene.add(button.mesh);
            }
        }
    }

    function directionButtonPressed(button){
        var tweenSpeed = 150;

        var origin = controls.unpressedColor;
        var target = {r : controls.pressedColor.r,
            g: controls.pressedColor.g,
            b : controls.pressedColor.b};

        var upButOrigin = controls.upUnpressedColor;
        var upButTarget = {r : controls.upPressedColor.r,
            g: controls.upPressedColor.g,
            b : controls.upPressedColor.b};
        var colorTween = new TWEEN.Tween(origin).to(target, tweenSpeed)
            .easing(TWEEN.Easing.Quartic.In)
            .repeat( 1 )
            .delay( 0 )
            .yoyo( true )
            .easing( TWEEN.Easing.Cubic.InOut )
            .onUpdate(
                function(){
                    var color = new THREE.Color().setRGB(
                        origin.r,
                        origin.g,
                        origin.b
                    );
                    switch (button) {
                        case "leftButton":
                                controls.buttons.left.mesh.material.color = color;
                            break;
                        case "rightButton":
                                controls.buttons.right.mesh.material.color = color;
                            break;
                        case "up":
                            controls.buttons.rightUp.mesh.material.color = color;
                            break;
                    }
                });
        colorTween.start();
        var originScale = new THREE.Vector3(1, 1, 1);
        var targetScale = new THREE.Vector3(.75,.75, .75);
        var sizeTween = new TWEEN.Tween(originScale).to(targetScale, tweenSpeed)
            .easing(TWEEN.Easing.Quartic.In)
            .repeat( 1 )
            .delay( 0 )
            .yoyo( true )
            .easing( TWEEN.Easing.Cubic.InOut )
            .onUpdate(
            function(){
                switch (button) {
                    case "leftButton":
                        controls.buttons.left.mesh.scale.copy(originScale);
                        break;
                    case "rightButton":
                        controls.buttons.right.mesh.scale.copy(originScale);
                        break;
                }
            });
        sizeTween.start();
    }

    function tweenUpButtonDown(){
        var tweenSpeed = controls.tweenSpeed;

        var origin = controls.upUnpressedColor;
        var target = {r : controls.upPressedColor.r,
            g: controls.upPressedColor.g,
            b : controls.upPressedColor.b};
        var colorTween = new TWEEN.Tween(origin).to(target, tweenSpeed)
            .easing(TWEEN.Easing.Quartic.In)
            .delay( 0 )
            .easing( TWEEN.Easing.Cubic.InOut )
            .onUpdate(
            function(){
                var color = new THREE.Color().setRGB(
                    origin.r,
                    origin.g,
                    origin.b
                );
                controls.buttons.rightUp.mesh.material.color = color;
                controls.buttons.leftUp.mesh.material.color = color;

            });
        colorTween.start();
        var originScale = new THREE.Vector3(
            controls.buttons.rightUp.mesh.scale.x,
            controls.buttons.rightUp.mesh.scale.y,
            controls.buttons.rightUp.mesh.scale.z
        );
        var targetScale = new THREE.Vector3(
            .75,
            .75,
            .75);
        var sizeTween = new TWEEN.Tween(originScale).to(targetScale, tweenSpeed)
            .easing(TWEEN.Easing.Quartic.In)
            .delay( 0 )
            .easing( TWEEN.Easing.Cubic.InOut )
            .onUpdate(
            function(){
                controls.buttons.rightUp.mesh.scale.copy(originScale);
                controls.buttons.leftUp.mesh.scale.copy(originScale);

            });
        sizeTween.start();
    }

    function tweenUpButtonUp(){
        var tweenSpeed = 150;

        var origin = controls.upPressedColor;
        var target = {r : controls.upUnpressedColor.r,
            g: controls.upUnpressedColor.g,
            b : controls.upUnpressedColor.b};
        var colorTween = new TWEEN.Tween(origin).to(target, tweenSpeed)
            .easing(TWEEN.Easing.Quartic.In)
            .delay( 0 )
            .easing( TWEEN.Easing.Cubic.InOut )
            .onUpdate(
            function(){
                var color = new THREE.Color().setRGB(
                    origin.r,
                    origin.g,
                    origin.b
                );
                controls.buttons.rightUp.mesh.material.color = color;
                controls.buttons.leftUp.mesh.material.color = color;
            });

        colorTween.start();
        var originScale = new THREE.Vector3(
            controls.buttons.rightUp.mesh.scale.x,
            controls.buttons.rightUp.mesh.scale.y,
            controls.buttons.rightUp.mesh.scale.z
        );
        var targetScale = new THREE.Vector3(1,1, 1);
        var sizeTween = new TWEEN.Tween(originScale).to(targetScale, tweenSpeed)
            .easing(TWEEN.Easing.Quartic.In)
            .delay( 0 )
            .easing( TWEEN.Easing.Cubic.InOut )
            .onUpdate(
            function(){
                controls.buttons.rightUp.mesh.scale.copy(originScale);
                controls.buttons.leftUp.mesh.scale.copy(originScale);

            });
        sizeTween.start();
    }

    function mouseClick() {
        var raycaster = new THREE.Raycaster(); // create once
        var mouse = new THREE.Vector2(); // create once


        mouse.x = ( event.clientX / renderer.domElement.width ) * 2 - 1;
        mouse.y = - ( event.clientY / renderer.domElement.height ) * 2 + 1;

        raycaster.setFromCamera( mouse, hudCamera );

        var intersectionArray = raycaster.intersectObjects( hudScene.children );
        loopIntersection:   //breakout point
        for (var i = 0; i < intersectionArray.length; i++) {
            if (intersectionArray[i].object) {
                switch (intersectionArray[i].object.name) {
                    case "leftButton":
                        directionButtonPressed("leftButton");
                        ShapeProto.setShapeMovement("left");
                        break;
                    case "rightButton":
                        directionButtonPressed("rightButton");
                        ShapeProto.setShapeMovement("right");
                        break;
                }
            }
        }
    }

    function mouseDown(event) {
        var mouse = new THREE.Vector2(); // create once

        mouse.x = ( event.clientX / renderer.domElement.width ) * 2 - 1;
        mouse.y = - ( event.clientY / renderer.domElement.height ) * 2 + 1;
        canvasDown(mouse);
    }

    function touchStart(event){
        var touch = new THREE.Vector2(); // create once

        touch.x = ( event.changedTouches[0].clientX / renderer.domElement.width ) * 2 - 1;
        touch.y = - ( event.changedTouches[0].clientY / renderer.domElement.height ) * 2 + 1;
        canvasDown(touch);
    }

    function canvasDown(vector2){

        var raycaster = new THREE.Raycaster(); // create once

        raycaster.setFromCamera( vector2, hudCamera );

        var intersectionArray = raycaster.intersectObjects( hudScene.children );
        for (var i = 0; i < intersectionArray.length; i++) {
            if (intersectionArray[i].object) {
                switch (intersectionArray[i].object.name) {
                    case "leftUp":
                    case "rightUp":
                        console.log('down');
                        tweenUpButtonDown();
                        ShapeProto.bolUpButtonPressed = true;
                        break;

                }
            }
        }
    }

    function mouseUp() {
        var mouse = new THREE.Vector2(); // create once

        mouse.x = ( event.clientX / renderer.domElement.width ) * 2 - 1;
        mouse.y = - ( event.clientY / renderer.domElement.height ) * 2 + 1;
        canvasUp(mouse);

    }

    function touchEnd(){
        var touch = new THREE.Vector2(); // create once
        touch.x = ( event.changedTouches[0].clientX / renderer.domElement.width ) * 2 - 1;
        touch.y = - ( event.changedTouches[0].clientY / renderer.domElement.height ) * 2 + 1;
        canvasUp(touch)
    }

    /*****************
     * called for touchend and mouseup events
     */
    function canvasUp(vector){
        var raycaster = new THREE.Raycaster(); // create once
        raycaster.setFromCamera( vector, hudCamera );

        var intersectionArray = raycaster.intersectObjects( hudScene.children );
        for (var i = 0; i < intersectionArray.length; i++) {
            if (intersectionArray[i].object) {
                switch (intersectionArray[i].object.name) {
                    case "leftUp":
                    case "rightUp":
                        console.log('up');
                        tweenUpButtonUp();
                        ShapeProto.bolUpButtonPressed = false;
                        break;

                }
            }
        }
    }



    function addEventListeners() {
        canvas.addEventListener('click', mouseClick, false);
        canvas.addEventListener('mousedown', mouseDown, false);
        canvas.addEventListener('mouseup', mouseUp, false);
        canvas.addEventListener('mouseup', mouseUp, false);
        window.addEventListener('resize', onWindowResize, false);
        canvas.addEventListener('touchstart', touchStart, false);
        canvas.addEventListener('touchend', touchEnd, false);
    }


    function createFallingShape() {
        var shape = new Shape(scene, world, boxWidth, boxHeight, boxDepth, height, numBoxesWide, wallData);
        //add the shape to the prototype's list of shapes
        ShapeProto.shapes[shape.shapeID] = shape;
        shapes.push(shape);
    }


});