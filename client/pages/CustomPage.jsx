import React, {useEffect, useState, useRef} from "react";
import { useLocation } from "react-router";
import { EventTypes, Viewer } from 'forge-dataviz-iot-react-components'
import BaseApp from './DataCenter/CustomBaseApp.jsx'
// import {BaseApp} from 'forge-dataviz-iot-react-components'
import DataHelper from './DataHelper';
import { SpriteSize, SensorStyleDefinitions, PropIdGradientMap, PropertyIconMap } from "../config/SensorStyles.js";

// import '../css/customPage.css';
/**
 * An interface file to allow customers to have their custom built application page.
 * @component
 */

 const surfaceShadingConfig = {
    spriteSize: SpriteSize,
    deviceStyles: SensorStyleDefinitions,
    gradientSetting: PropIdGradientMap
};

class EventBus {}

THREE.EventDispatcher.prototype.apply(EventBus.prototype)

function CustomPage(props) {
    const { env, docUrn } = props.appData;
    const queryParams = new URLSearchParams(useLocation().search);
    const geomIndex = queryParams.get("geometryIndex") ? parseInt(queryParams.get("geometryIndex")) : undefined;

    const eventBusRef = useRef(new EventBus())
    const [data, setData] = useState();
    const [model, setModel] = useState(null);

    const dataRef = useRef();
    const viewerRef = useRef(null)
    const leafNodesRef = useRef([]);
    const [darkMode, setDarkMode] = useState(false)

    const renderSettings = {
        showViewables: true,
        occlusion: false,
        showTextures: true,
        heatmapType: "GeometryHeatmap"
    };


    async function getRoomDbIds(model) {
        return new Promise((resolve,reject)=>{
            model.search('cisco c9300-24t', resolve, reject,['Label'],{ searchHidden: true })
        })
    }

    async function getPropAsync(dbId, model) {
        return new Promise((resolve, reject) => {
            model.getProperties(dbId, result => resolve(result));
        });
    }

    async function getRoomName(dbId, model) {
        const result = await getPropAsync(dbId, model);
        const nameProp = result.properties.find(p => p.attributeName === 'Label');
        if (nameProp==undefined)return ""
        else return nameProp.displayValue
    }

    // set up model show in viewer
    useEffect(()=>{
        eventBusRef.current.addEventListener(EventTypes.MODEL_LOAD_COMPLETED, async function(event){
            document.title = "DataVitualize"

            viewerRef.current = event.data.viewer;
            let viewer = viewerRef.current;

            let model = event.data.data.model;
            setModel(model);
            // const model = viewer.model;

            let levelsExt = null;


            // load model
            let viewerDocument = model.getDocumentNode().getDocument();
            const aecModelData = await viewerDocument.downloadAecModelData();
            if (aecModelData) {
                levelsExt = await viewer.loadExtension("Autodesk.AEC.LevelsExtension", {
                    doNotCreateUI: true,
                });
            }


            // map device to model and set shading
            let session = event.data.session;
            let devicesList = session.dataStore.deviceModels[0].devices;
            let dataHelper = new DataHelper();
            let deviceMapped = await dataHelper.createShadingGroupByName(model,devicesList);
            let shadingData = await dataHelper.createShadingData(viewer, model, deviceMapped);
            let devicePanelData = dataHelper.createDeviceTree(shadingData, true);
            // get data
            const propertyMap = session.dataStore;

            //Get the property data from the device model
            //let deviceProperty = propertyMap.get(propertyId);

            // set materials
            model.unconsolidate(); // If the model is consolidated, material changes won't have any effect
            const tree = model.getInstanceTree();
            const frags = model.getFragmentList();
            // instantiate a loader
            var loader = new THREE.TextureLoader();

            //allow cross origin loading
            loader.crossOrigin = '';

            const networks = require('../config/Devices.json')
            for(const [key, value] of Object.entries(networks)){
                // load all resource
                loader.load('http://128.199.183.124:9081/assets/Interfaces/'+key+".png",
                function ( texture ) {
                    // set side 1.7 and 3.5
                    texture.offset.x = 0.5
                    texture.offset.y = 0.05
                    switch(value){
                        case 3.5:
                            texture.repeat.set(0.68, 3);
                            break;
                        case 5.5:
                            texture.repeat.set(0.68, 2);
                            break;
                        default:
                            texture.repeat.set(0.68, 6.5);
                    }
                    const material = new THREE.MeshBasicMaterial({
                        map:texture,
                        side: THREE.DoubleSide 
                    })
                    viewer.impl.matman().addMaterial("FloorMaterial", material, true);
                    viewer.search(key,async function(dbids){
                        await dbids.forEach(async (element)=>{
                            let bigger = 0;
                            tree.enumNodeFragments(element, (fragid) => {
                                if(fragid>bigger) bigger=fragid
                            });
                            frags.setMaterial(bigger, material);
                            viewer.impl.invalidate(true, true, false);
                    })
                   
            });         
       })
            }

            dataRef.current = {
                shadingData,
                devicePanelData,
            };
            setData(dataRef.current);
        })
        
        //set up for 
    },[])

    return (
        <React.Fragment>
        <div>
            <BaseApp
               {...props}
               eventBus={eventBusRef.current}
               data={data}
               renderSettings={renderSettings}
               surfaceShadingConfig={surfaceShadingConfig}
               propertyIconMap={PropertyIconMap}
               geomIndex={geomIndex}
            /> 
        </div>
        </React.Fragment>
    );
}

export default CustomPage;
