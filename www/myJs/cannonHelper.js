/**
 * Created by Reginald on 5/28/2015.
 */

var CannonHelper = {
    createSphere : function(mass, radius){
        var sphereShape = new CANNON.Sphere(radius); // Step 1
        var sphereBody = new CANNON.Body({mass: mass, shape: sphereShape});
        return shpereBody;
    },
    createStaticBox : function(mesh){
        var boxShape =  CannonHelper.getBoxShape(mesh);
        var boxBody = new CANNON.Body({mass: 0, shape: CannonHelper.getBoxShape(mesh)});
        return boxBody;
    },
    createBox : function(params){

        var boxShape =  CannonHelper.getBoxShape(params.mesh);
        var boxBody = new CANNON.Body({mass: params.mass, shape: CannonHelper.getBoxShape(params.mesh)});
        if(params.material){
            boxBody.material = params.material;
        }
        return boxBody;
    },

    getBoxShape: function(mesh){
        var meshDim = CannonHelper.getBoxDimension(mesh);
        var boxShape = new CANNON.Box(meshDim);
        return boxShape;
    },

    getBoxDimension : function (mesh){
        var box = new THREE.Box3();
        box.setFromObject(mesh);


        var xdim = (box.max.x - box.min.x)/2;
        var ydim = (box.max.y - box.min.y)/2;
        var zdim = (box.max.z - box.min.z)/2;

        return new CANNON.Vec3(xdim, ydim, zdim);
    }
}