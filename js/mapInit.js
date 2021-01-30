//reuseable public functions
let makeAbuffer,showBuffer;
//map instance
let map,currPoint,gsvc,search,dialog;
//required features from ARCGIS js 3.35
const requiredFeatures = [
  "esri/map",
  "esri/layers/FeatureLayer",
  "esri/geometry/webMercatorUtils",
  "esri/tasks/GeometryService",
  "esri/tasks/BufferParameters",
  "esri/dijit/Search",
  "esri/InfoTemplate",
  "esri/symbols/SimpleFillSymbol",
  "esri/symbols/SimpleLineSymbol",
  "esri/renderers/SimpleRenderer",
  "esri/graphic",
  "esri/lang",
  "esri/Color",
  "dojo/number",
  "dojo/dom-style",
  "dijit/TooltipDialog",
  "dijit/popup",
  "dojo/dom",
  "dojo/domReady!"
];

require(requiredFeatures,
function(
  Map,
  FeatureLayer,
  webMercatorUtils,
  GeometryService,
  BufferParameters,
  Search,
  InfoTemplate,
  SimpleFillSymbol,
  SimpleLineSymbol,
  SimpleRenderer,
  Graphic,
  esriLang,
  Color,
  number,
  domStyle,
  TooltipDialog,
  dijitPopup,
  dom) {

  //initialize the map, and pass the div where it should go
  map = new Map("mapContainer", {
    //For full list of pre-defined basemaps, navigate to http://arcg.is/1JVo6Wd
    basemap: "satellite",
    // longitude, latitude
    // cairo center (31.2357,30.0444)
    center: [-88.2, 41.8],
    zoom: 5
  });

  //define an instance for feature layer, then add the layer on the map
  const damageAssessmentStatePlane = new FeatureLayer(
      "https://sampleserver6.arcgisonline.com/arcgis/rest/services/DamageAssessmentStatePlane/MapServer/0", {
      outFields: ["*"]
    });

  //make custom renderer before adding the layer
  // const symbol = new SimpleFillSymbol(
  //   SimpleFillSymbol.STYLE_SOLID,
  //   new SimpleLineSymbol(
  //     SimpleLineSymbol.STYLE_SOLID,
  //     new Color([255,255,255,0.35]),
  //     1
  //   ),
  //   new Color([125,125,125,0.35])
  // );
  // damageAssessmentStatePlane.setRenderer(new SimpleRenderer(symbol));

  map.addLayer(damageAssessmentStatePlane);
  map.infoWindow.resize(245,125);

  const highlightSymbol = new SimpleFillSymbol(
    SimpleFillSymbol.STYLE_SOLID,
    new SimpleLineSymbol(
      SimpleLineSymbol.STYLE_SOLID,
      new Color([255,0,0]), 3
    ),
    new Color([125,125,125,0.35])
  );

  //listen for when the onMouseOver event fires on the feature layer added
  //when fired, create a new graphic with the geometry from the event.graphic and add it to the maps graphics layer
  damageAssessmentStatePlane.on("mouse-over", function(evt){
    const text = "Entity with ObjectId ${objectid}"+
        "Contact First Name: ${firstname}</br>Incident Name: ${incidentnm}</br>Inspection Date Time: ${inspdate}</br>Thank you!";

    const content = esriLang.substitute(evt.graphic.attributes,text);
    const highlightGraphic = new Graphic(evt.graphic.geometry,highlightSymbol);
    map.graphics.add(highlightGraphic);

    dialog.setContent(content);

    domStyle.set(dialog.domNode, "opacity", 0.85);
    dijitPopup.open({
      popup: dialog,
      x: evt.pageX,
      y: evt.pageY
    });
  });

  //info dialog initialization
  dialog = new TooltipDialog({
    id: "tooltipDialog",
    style: "position: absolute; width: 250px; font: normal normal normal 10pt Helvetica;z-index:100"
  });
  dialog.startup();

  //define new search instance & search widget
  search = new Search({
    map: map,
    sources: [],
    zoomScale: 5000000
  }, "search");

  const sources = search.sources;
  sources.push({
    featureLayer: damageAssessmentStatePlane,
    placeholder: "Search ObjectId",
    enableLabel: false,
    searchFields: ["objectId"],
    displayField: "Object Id",
    exactMatch: false,
    outFields: ["*"],
    infoTemplate: new InfoTemplate("Entity with ObjectId ${objectid}",
    "Contact First Name: ${firstname}</br>Incident Name: ${incidentnm}</br>Inspection Date Time: ${inspdate}</br>Thank you!")

  });
  //Set the sources above to the search widget
  search.set("sources", sources);
  search.startup();

  map.on("load", function() {
    //after map loads, connect to listen to mouse move & drag events
    map.on("mouse-move", showCoordinates);
    map.on("mouse-drag", showCoordinates);
    //update mouse event for modal
    map.graphics.enableMouseEvents();
    map.graphics.on("mouse-out", closeDialog);
  });

  function closeDialog() {
    map.graphics.clear();
    dijitPopup.close(dialog);
  }

  function showCoordinates(evt) {
    //the map is in web mercator but display coordinates in geographic (lat, long)
    const mp = webMercatorUtils.webMercatorToGeographic(evt.mapPoint);
    currPoint = evt.mapPoint;
    //display mouse coordinates
    dom.byId("coordinates").innerHTML = mp.x.toFixed(3) + ", " + mp.y.toFixed(3);
  }
  gsvc = new GeometryService("https://utility.arcgisonline.com/ArcGIS/rest/services/Geometry/GeometryServer");
  makeAbuffer = ()=>{
    console.log({
      currPoint
    });
    map.graphics.clear();
    var params = new BufferParameters();
    params.geometries = [ currPoint ];

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
        new dojo.Color([0,0,255,0.65]), 2
      ),
      new dojo.Color([0,0,255,0.35])
    );

    dojo.forEach(geometries, function(geometry) {
      var graphic = new esri.Graphic(geometry,symbol);
      map.graphics.add(graphic);
    });
  }

});