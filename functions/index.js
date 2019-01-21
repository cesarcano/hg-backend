const functions = require('firebase-functions');
var admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

var dba = admin.database();

const gasolinerasNodo = dba.ref("/gasolineras");
const coordenadasNodo = dba.ref("/coordenadas");
const combustiblesNodo = dba.ref("/combustibles");
const comentariosNodo = dba.ref("/comentarios");

exports.getstations = functions.https.onRequest((request, response) => {
    if(request.method !== "POST"){
        response.send(405, 'HTTP Method ' + request.method +' not allowed');
    }
    // se buscan los combustibles
    const lat = request.body.lat;
    const lng = request.body.lng;
    const distance = request.body.distance;
    const marcas = request.body.marcas;
    const filtro = request.body.filtro;
    const combustibles = request.body.combustibles;
    const dpi = request.body.dpi;

    let mlat = Math.trunc(lat) - 1;
    let mlng = Math.trunc(lng) - 1;
    let combId = combustibles[0];

    let respuesta = [];
    return coordenadasNodo.child(mlat).child(mlng).once("value", (snapshot) => {
        if(snapshot.val() !== null) {
        snapshot.forEach(snap => {
            let isMarca = esDeLaMarca(snap.key, marcas);
            if (isMarca) {
            snap.forEach(s => {
                let g = s.val();
                let tieneDistancia = estaCerca(g.lat, g.lng, lat, lng, distance);
                let hasCombustibles = tieneCombustibles(combustibles, g.combustibles);
                if (tieneDistancia && hasCombustibles) {
                let gasResponse = {
                    id: s.key,
                    calificacion: Math.round(g.calificacion),
                    direccion: g.direccion,
                    lat: g.lat,
                    lng: g.lng,
                    url:"https://firebasestorage.googleapis.com/v0/b/hellogas-3db04.appspot.com/o/marcadores%2F" + getIconUrl(g.marca, dpi) + "?alt=media",
                    marca: g.marca,
                    distancia: calcularDistancia(lat, lng, g.lat, g.lng),
                    combustibles: g.combustibles
                };   
                respuesta.push(gasResponse);
                }
            });
            }
        });
        }
    }).then(() => {
        return coordenadasNodo.child(mlat+1).child(mlng+1).once("value", (snapshot) => {
        if(snapshot.val() !== null) {
            snapshot.forEach(snap => {
            let isMarca = esDeLaMarca(snap.key, marcas);
            if (isMarca) {
                snap.forEach(s => {
                let g = s.val();
                let tieneDistancia = estaCerca(g.lat, g.lng, lat, lng, distance);
                let hasCombustibles = tieneCombustibles(combustibles, g.combustibles);
                if (tieneDistancia && hasCombustibles) {
                    let gasResponse = {
                    id: s.key,
                    calificacion: Math.round(g.calificacion),
                    direccion: g.direccion,
                    lat: g.lat,
                    lng: g.lng,
                    url:"https://firebasestorage.googleapis.com/v0/b/hellogas-3db04.appspot.com/o/marcadores%2F" + getIconUrl(g.marca, dpi) + "?alt=media",
                    marca: g.marca,
                    distancia: calcularDistancia(lat, lng, g.lat, g.lng),
                    combustibles: g.combustibles
                    };   
                    respuesta.push(gasResponse);
                }
                });
            }
            });
        }
        }).then(() => {
        return coordenadasNodo.child(mlat+2).child(mlng+2).once("value", (snapshot) => {
            if(snapshot.val() !== null) {
            snapshot.forEach(snap => {
                let isMarca = esDeLaMarca(snap.key, marcas);
                if (isMarca) {
                snap.forEach(s => {
                    let g = s.val();
                    let tieneDistancia = estaCerca(g.lat, g.lng, lat, lng, distance);
                    let hasCombustibles = tieneCombustibles(combustibles, g.combustibles);
                    if (tieneDistancia && hasCombustibles) {
                    let gasResponse = {
                        id: s.key,
                        calificacion: Math.round(g.calificacion),
                        direccion: g.direccion,
                        lat: g.lat,
                        lng: g.lng,
                        url:"https://firebasestorage.googleapis.com/v0/b/hellogas-3db04.appspot.com/o/marcadores%2F" + getIconUrl(g.marca, dpi) + "?alt=media",
                        marca: g.marca,
                        distancia: calcularDistancia(lat, lng, g.lat, g.lng),
                        combustibles: g.combustibles
                    };   ta.push(gasResponse);
                    }
                });
                }
            });
            }
        }).then(() => {
            switch (filtro) {
            case "0":  // Filtro en mapa -> Distancia
                respuesta.sort((a, b) => parseFloat(a.distancia) - parseFloat(b.distancia));
                break;
            case "1": // Filtro por precio
                respuesta.sort((a, b) => parseFloat(a.combustibles[combId]) - parseFloat(b.combustibles[combId]));
                break;
            case "2": // Filtro por calificación
                respuesta.sort((a, b) => parseFloat(a.calificacion) - parseFloat(b.calificacion));
                break;
            case "3":  // filtro distancia
                respuesta.sort((a, b) => parseFloat(a.distancia) - parseFloat(b.distancia));
                break;
            default:
                break;
            }    
            return response.send(respuesta);
        });
        });
    });
});

function esDeLaMarca(gMarca, marcas_array) {
  var flag = 0;
  marcas_array.forEach(marca => {
    let m = marca.replace(/\s/g,'');
    if (m.toLowerCase() === "all") 
        flag += 1;
    if (gMarca.toUpperCase() === m.toUpperCase()) 
        flag += 1;
  });  
  if (flag > 0) {
      return true;
  }
  return false;
}
// Evalua si la gasolinera tiene los combustibles
function tieneCombustibles(combustibles_array, snapCombs) {
  let flag = 0;
    combustibles_array.forEach(combustible => {
        if (combustible.toLowerCase() === "all") 
            flag += 1;
        if (snapCombs.hasOwnProperty(combustible)) {
            flag += 1;
        }
    });
  if (flag > 0) {
      return true;
  }
  return false;
}
// Evalúa si la gasolinera está en el área
function estaCerca(gLat, gLng, lat, lng, distance) {  
  let distancia = calcularDistancia(lat, lng, gLat, gLng);
  if (distancia <= distance) {
      return true;
  } 
  return false;
}

function calcularDistancia(lat1,lon1,lat2,lon2) {
  rad = function(x) {return x * Math.PI/180;}
  var R = 6378137; //Radio de la tierra en metros
  var dLat = rad( lat2 - lat1 );
  var dLong = rad( lon2 - lon1 );
  var a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLong/2) * Math.sin(dLong/2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  var d = R * c;
  
  return parseInt(d); 
}

function getIconUrl(marca, dpi) {
  let url = '';
  let url_icon = "";
  dpi === "low"? url_icon = "ldpi": 
  dpi === "mid"? url_icon = "mdpi": 
  dpi === "high"? url_icon = "hdpi":
  url_icon = "mdpi";
  let m = marca.replace(" ", "");
  m =  m.toLowerCase();
  url = "ico_" + m + "_" + url_icon + ".png";
  return url;
}
exports.nuevoComentario = functions.database.ref('/comentarios/{gasId}/{pushId}')
  .onWrite((snapshot, context) => {
    // Grab the current value of what was written to the Realtime Database.
    const gId = context.params.gasId;
    let calificacion = 0;
    let i = 0;
    return comentariosNodo.child(gId).once("value", (comments) => {
      if (comments.val() !== null) {
        comments.forEach(comentario => {
          if (comentario.val() !== null) {
                      let v = comentario.val();
                      i++;
                      calificacion += parseFloat(v.calificacion);
          }
        });
      }
      calificacion = calificacion > 0 ? parseFloat(calificacion / i) : calificacion;
    }).then(()=> {
      return gasolinerasNodo.child(gId).child("calificacion").set(calificacion).then(() => {
        return gasolinerasNodo.child(context.params.gasId).once("value", (snap) => {
          let gasolinera = snap.val();
          let marca = gasolinera.marca;
          marca = marca.replace(/\s/g,'');
          marca = marca.toUpperCase();
          let lat = Math.trunc(gasolinera.lat);
          let lng = Math.trunc(gasolinera.lng);
          return coordenadasNodo.child(lat).child(lng).child(marca)
          .child(context.params.gasId).child("calificacion").set(calificacion);
        })
      });
    });
  });