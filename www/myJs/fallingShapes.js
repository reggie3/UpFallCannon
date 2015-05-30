
var startingY;
var boxMass = 1;
var boxRestitution = .2;
var useNumberTexture = true;   //display shape ID's on the blocks
var numBlocksToMatch = 3;

//create a random box in a random location
function Shape(scene, world, boxWidth, boxHeight, boxDepth, height, numBoxesWide, walls) {

    //numBoxesWide = 3;
    this.scene = scene;
    this.boxHeight = boxHeight;
    //this.numBoxesWide = numBoxesWide;
    this.numBoxesWide = 5;
    startingY = -15;

    this.shapeID = this.currentID;
    ShapeProto.currentID++;

    //determine the color
    var colorIndex = getRandBetween(0, this.boxColors.length - 1);
    this.shapeColor = this.colors[colorIndex];
    // Box

    var mat;
    if(useNumberTexture){
        // create a canvas element
        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d');
        context.fillStyle="#FF0000";

        var tex = new THREE.Texture(this.canvasTexture(this.shapeID, this.colors[colorIndex]));
        tex.minFilter = THREE.LinearFilter;
        tex.needsUpdate = true;

        mat = new THREE.MeshBasicMaterial( {map: tex, side:THREE.DoubleSide } );
    }
    else{
        mat = new THREE.MeshLambertMaterial({
            color: this.boxColors[colorIndex]
        });
    }
    this.mesh = new THREE.Mesh(new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth), mat);
    this.columnNumber = Math.floor(Math.random() * this.numBoxesWide);


    // Create a slippery material (friction coefficient = 0.0)
    var slipperyMaterial = new CANNON.Material("slipperyMaterial");
    // The ContactMaterial defines what happens when two materials meet.
    // In this case we want friction coefficient = 0.0 when the slippery material touches ground.
    var boxMaterial = new CANNON.Material("boxMaterial");
    var slippery_ground_cm = new CANNON.ContactMaterial(boxMaterial, slipperyMaterial, {
        friction: 0
    });
    // We must add the contact materials to the world
    world.addContactMaterial(slippery_ground_cm);

    this.body = CannonHelper.createBox({mesh:this.mesh, mass:boxMass, material:slippery_ground_cm});
    this.body.shapeID = this.shapeID;
    this.body.position.x = boxWidth * (this.columnNumber - numBoxesWide / 2);
    this.body.position.y = startingY;

    this.body.angularDamping = 1;

    var that= this;
    //this.body.addEventListener("collide", function (event) {
    //    //event.target is the item calling the event
    //    //event.body is the item being hit by the calling item
    //    if ((event.body === walls.ceiling.body ) || (((event.body.position.y > event.target.position.y) &&
    //        (event.body.position.x - event.target.position.x === 0) &&
    //        (Math.abs(event.body.velocity.y) < .01)))) {
    //        that.collisionHandler(that, event.body.shapeID);
    //    }
    //});


    this.mesh.position.copy(this.body.position);
    this.originalXPos = this.body.position.x;
    this.originalZPos = this.body.position.z;
    this.mesh.quaternion.copy(this.body.quaternion);

    var that=this;


    scene.add(this.mesh);
    world.add(this.body);



    this.columnNumber = Math.floor(Math.random() * numBoxesWide);
}

var ShapeProto = {
    originalXPos: undefined,
    originalZPos: undefined,
    mesh: undefined,
    body: undefined,
    boxColors: [0xff0000, 0xffff00, 0x00ff00, 0x0000ff],
    colors: ["red", "yellow", "green", "blue"],

    //boxColors: [0xff0000, 0xffff00],
    //colors: ["red", "yellow"],
    shapeID: undefined,
    currentID: 0,
    shapes: {},
    columnNumber: undefined,
    shapeColor: undefined,
    index: undefined,   //the position of this shape in its column
    bolIsDead: false,
    scene: undefined,
    bolIsFirstFrame: true,
    lastVel: new THREE.Vector3(),
    boxHeight: undefined,   //height of a box
    collidedWith: "none",
    movementState: undefined,
    collisionState: 'none',
    hasCollisionListener: false,

    update: function () {
        this.body.inertia.set(0,0,0);
        this.body.invInertia.set(0,0,0);
        this.body.position.x = this.originalXPos;
        this.body.position.z = this.originalZPos;

        this.mesh.position.copy(this.body.position);
        this.mesh.quaternion.copy(this.body.quaternion);

        if(this.shapeID===0) {
            //console.log(this.body.position.x, this.body.position.y, this.body.position.z);
        }
        //console.log("y vel: " + this.body.velocity.y);



    },

    //mark this blick as dead.  We'll remove all the dead blocks in one go
    kill: function (id) {
        ShapeProto.shapes[id].bolIsDead = true;
    },

    //remove the dead blocks from the data matrix
    removeDeadBlocks: function (scene, world) {

        //loop through the shapes and update
        for (var key in ShapeProto.shapes) {
            if (ShapeProto.shapes.hasOwnProperty(key)) {
                var shape = ShapeProto.shapes[key];
                if(shape.bolIsDead){
                    scene.remove(shape.mesh);
                    delete ShapeProto.shapes[key];
                    world.removeBody(shape.body);
                }
            }
        }
    },

    collisionHandler: function (source, collidedWithID) {

        if ((source.collidedWith !== collidedWithID) && (source.collisionState==='none')){
            source.collisionState = 'initialCollision';
            console.log(source.shapeID + " initialCollision collision");

        }
        else if (source.collidedWith !== collidedWithID) {
            //console.log(this.shapeID + " followOnCollision collision");
            source.collisionState = 'followOnCollision';
            console.log(source.shapeID + " Collided with body:",  collidedWithID);
        }
        this.collidedWith = collidedWithID;

        ////this is not a blocks initial collision, but still check to see if it has any matches
        if ((source.collisionState === 'followOnCollision')||(source.collisionState ==='initialCollision')){
            //check for matches
            //console.log(this.collisionState + " for ID: " + this.shapeID + " | col# " + this.columnNumber + ", " + this.index);
            var matchStack = { color: source.shapeColor, matches: {}, checkedShapes: {} };   //clear the match stack prior to checking for matches
            matchStack = source.checkForMatches(matchStack, source);
            source.killMatchStickMembers(matchStack);
            source.collisionState = 'collisionHandled';

        }
    },

    killMatchStickMembers: function (matchStack) {
        //print out the nuber of matches
        var numMatches = Object.keys(matchStack.matches).length;
        if (numMatches > 1) {
            //console.log(numMatches + " " + matchStack.color  + " matches found");

            //remove the matching blocks from the scene
            if (Object.keys(matchStack.matches).length >= numBlocksToMatch) {
                for (var key in matchStack.matches) {
                    if (matchStack.matches.hasOwnProperty(key)) {
                        ShapeProto.kill(key);
                    }
                }
            }
        }
    },

    readyHandler: function () {
        bolReadyForNewShape = true;
        this.physiShape.setAngularFactor(new THREE.Vector3());
        this.physiShape.setLinearFactor(new THREE.Vector3(1, 1, 0));
    },

    /************************************
     * checkForMatches
     *  recursively checks for color matches in the blocks above, below, to the left, and the right.  If a match is found
     *  then place it in the matchStack and then search its neighbors
     * Parameters:
     *  matchStack: the stack of matching shapes, contains the color that we are looking for as "color"
     *  shape: the shape who's neighbors will be examined
     * Returns:
     *  matchStack
     */
    checkForMatches: function (matchStack, shape) {
        //check to see if this shape is already in the match stack
        // if it is then just return the stack
        if (!matchStack.matches[shape.shapeID]) {
            //console.log("checking " + matchStack.color + " at " + shape.columnNumber + ", " + shape.index);
            if (this.shapeColor === matchStack.color) {
                matchStack.matches[shape.shapeID] = this;
                matchStack.checkedShapes[shape.shapeID] = true;

                var originPoint = shape.mesh.position.clone();
                var myRays = {};

                myRays.left = new THREE.Raycaster( originPoint, new THREE.Vector3(-this.boxHeight/2, 0, 0),
                    this.boxHeight/2, this.boxHeight/2 + this.boxHeight );
                myRays.right = new THREE.Raycaster( originPoint, new THREE.Vector3(this.boxHeight/2, 0, 0),
                    this.boxHeight/2, this.boxHeight/2 + this.boxHeight );
                myRays.top = new THREE.Raycaster( originPoint, new THREE.Vector3(0, this.boxHeight/2, 0),
                    this.boxHeight/2, this.boxHeight/2 + this.boxHeight );
                myRays.bottom = new THREE.Raycaster( originPoint, new THREE.Vector3(0, -this.boxHeight/2, 0),
                    this.boxHeight/2, this.boxHeight/2 + this.boxHeight );


                for (var rayKey in myRays) {
                    //loop through the shapes and update
                    for (var key in ShapeProto.shapes) {
                        if (ShapeProto.shapes.hasOwnProperty(key)) {
                            if(ShapeProto.shapes[key].shapeID !== shape.shapeID) { 
                                var collisionResults = myRays[rayKey].intersectObject( ShapeProto.shapes[key].mesh);
                                if(collisionResults.length>0){
                                    if(!matchStack.checkedShapes[ShapeProto.shapes[key].shapeID]) {
                                        //console.log("adjacent Found: " + shape.shapeID + " : " + ShapeProto.shapes[key].shapeID );
                                        if(ShapeProto.shapes[key].shapeColor === shape.shapeColor) {
                                            this.checkForMatches(matchStack, ShapeProto.shapes[key]);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        return matchStack;
    },

    canvasTexture: function(id,color) {
        var size = 257;
        var canvas = document.createElement('canvas');

        canvas.width = canvas.height = size;
        var context = canvas.getContext('2d');
        context.font = '100pt Arial';
        context.fillStyle = color;
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = 'white';
        context.fillRect(20, 20, canvas.width - 40, canvas.height - 40);
        context.fillStyle = 'black';
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(id, canvas.width / 2, canvas.height / 2);

        return canvas;
    }
};

Shape.prototype = ShapeProto;