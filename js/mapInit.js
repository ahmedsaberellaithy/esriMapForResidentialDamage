//reuseable public functions
let makeAbuffer,showBuffer,executeQuery;
//map instance
let map,currPoint,gsvc,queryTask;

//useful variables
const pointsHashmap = {};
let pointsCounter = 0;
const layerUrl = "https://sampleserver6.arcgisonline.com/arcgis/rest/services/DamageAssessmentStatePlane/MapServer/0";

//required features from ARCGIS js 3.35
const requiredFeatures = [
  "esri/map",
  "esri/layers/FeatureLayer",
  "esri/geometry/webMercatorUtils",
  "esri/tasks/GeometryService",
  "esri/tasks/BufferParameters",
  "esri/InfoTemplate",
  "esri/tasks/query",
  "esri/tasks/QueryTask",
  "esri/symbols/SimpleMarkerSymbol",
  "dojo/dom",
  "dojo/domReady!"
];

function getFormattedInfoTemplateContent(graphic){
  const attributes = graphic.attributes;
  const dateFormatted = new Date(attributes.inspdate);

  return `Contact First Name: ${attributes.firstname}</br>Incident Name: ${attributes.incidentnm}</br>Inspection DateTime: ${dateFormatted}`;
}

require(requiredFeatures,
function(
  Map,
  FeatureLayer,
  webMercatorUtils,
  GeometryService,
  BufferParameters,
  InfoTemplate,
  Query,
  QueryTask,
  SimpleMarkerSymbol,
  dom) {

  //initialize the map, and pass the div where it should go
  map = new Map("mapContainer", {
    //For full list of pre-defined basemaps, navigate to http://arcg.is/1JVo6Wd
    basemap: "satellite",
    // longitude, latitude
    // cairo center (31.2357,30.0444)
    center: [-88.2, 41.8],
    zoom: 8
  });

  const infoTemplate = new InfoTemplate(
    "Entity with ObjectId ${objectid}",
    getFormattedInfoTemplateContent);

  //define an instance for feature layer, then add the layer on the map
  const damageAssessmentStatePlane = new FeatureLayer(
      layerUrl, {
      outFields: ["objectid","firstname","incidentnm","inspdate"],
      infoTemplate
    });

  map.addLayer(damageAssessmentStatePlane);

  //initialize query task
  queryTask = new QueryTask(layerUrl);


  //that was initially used with scope change it was planned to be used with the listing
  map.on('extent-change', function (evt) {
    query.geometry = evt.extent;
    damageAssessmentStatePlane.selectFeatures(query, FeatureLayer.SELECTION_NEW, function (features) {
      dom.byId("count").innerHTML = features.length;
      let results = ""
        resultsHeader = "<tr><th>ObjectId</th>";
      
      resultsHeader += "<th>first Name</th>";
      resultsHeader += "<th>incident Name</th>";
      resultsHeader += "<th>inspection Date</th>";
      resultsHeader += "<th>Show Point</th></tr>";

      for (var i = 0; i < features.length; i++) {
        if(features[i].attributes.objectid){
          pointId = pointsCounter++;
          pointsHashmap[pointId]=features[i].geometry;
          results += "<tr><td>" + features[i].attributes.objectid +"</td>";
          results += "<td>" + features[i].attributes.firstname +"</td>";
          results += "<td>" + features[i].attributes.incidentnm +"</td>";
          results += "<td>" + new Date(features[i].attributes.inspdate) +"</td>";
          results += "<td>" + `<button type="button" class="btn btn-sm btn-success" id="bufferButton" onclick="makeAbuffer(${pointId})">buffer</button>` +"</td>";
          results += "</td></tr>";
        }
      }
      dom.byId("resultsTableHead").innerHTML = resultsHeader;
      dom.byId("resultsTableBody").innerHTML = results;
    });
  });


  //initialize query
  query = new Query();
  query.returnGeometry = true;
  query.outFields = ["objectid","firstname","incidentnm","inspdate"];

  //create symbol for selected features
  var symbol = new SimpleMarkerSymbol();
  symbol.setStyle(SimpleMarkerSymbol.STYLE_SQUARE);
  symbol.setSize(10);

  map.on("load", function() {
    //after map loads, connect to listen to mouse move & drag events
    map.on("mouse-move", showCoordinates);
    map.on("mouse-drag", showCoordinates);
  });

  executeQuery = () => {
    const searchValue = dom.byId("objectIdSearchValue").value ;
    //set query based on what user typed in for population;
    query.where = "objectid > " + searchValue;
    //execute query
    queryTask.execute(query,showResults);
  }

  function showResults(featureSet){
    //remove all graphics on the maps graphics layer
    map.graphics.clear();

    //Performance enhancer - assign featureSet array to a single variable.
    var resultFeatures = featureSet.features;

    //Loop through each feature returned
    for (var i=0, il=resultFeatures.length; i<il; i++) {
      //Get the current feature from the featureSet.
      //Feature is a graphic
      var graphic = resultFeatures[i];
      console.log(resultFeatures);
      graphic.setSymbol(symbol);

      //Set the infoTemplate.
      graphic.setInfoTemplate(infoTemplate);

      //Add graphic to the map graphics layer.
      map.graphics.add(graphic);
    }
  }

  function showCoordinates(evt) {
    //the map is in web mercator but display coordinates in geographic (lat, long)
    const mp = webMercatorUtils.webMercatorToGeographic(evt.mapPoint);
    currPoint = evt.mapPoint;
    //display mouse coordinates
    dom.byId("coordinates").innerHTML = mp.x.toFixed(3) + ", " + mp.y.toFixed(3);
  }
  gsvc = new GeometryService("https://utility.arcgisonline.com/ArcGIS/rest/services/Geometry/GeometryServer");
  makeAbuffer = (pointId)=>{
    let point = null;
    if(!pointId){
      point = currPoint; //current point represents the last active point under the map
    }else{
      point = pointsHashmap[pointId];
      currPoint = point;
    }
    map.graphics.clear();
    var params = new BufferParameters();
    params.geometries = [ point ];

    //buffer in linear units such as meters, km, miles etc.
    params.distances = [ 2, 2 ];
    params.unit = GeometryService.UNIT_KILOMETER;
    params.outSpatialReference = map.spatialReference;

    gsvc.buffer(params, showBuffer);
  }

  showBuffer = (geometries)=> {
    var symbol = new esri.symbol.SimpleFillSymbol(
      esri.symbol.SimpleFillSymbol.STYLE_SOLID,
      new esri.symbol.SimpleLineSymbol(
        esri.symbol.SimpleLineSymbol.STYLE_SOLID,
        new dojo.Color([128,128,128,0.65]), 2
      ),
      new dojo.Color([0,0,255,0.35])
    );

    dojo.forEach(geometries, function(geometry) {
      var graphic = new esri.Graphic(geometry,symbol);
      map.graphics.add(graphic);
    });
  }

});