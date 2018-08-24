var functions = require('firebase-functions');
var admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

var db = admin.database();

/**
 *  EXTRAS
 */
const httpsReq = require('https');

// REFERENCES
var usersRef = db.ref("/users");
var gstationsRef = db.ref("/gasolineras");
var combustiblesRef = db.ref("/combustibles");
var comentarioRef = db.ref("/comentarios");
var serviciosRef = db.ref("/servicios");

/**
 *  AUTH
 */
// Trigger calcular calificacion a gasolinera (cada que se agrega un comentario)
/**
 *  USUARIOS
 */
exports.adduser = functions.https.onRequest((request, response) => {
    let id = request.query.id;
    let email = request.query.email;
    let nombre = request.query.nombre;
    let sexo = request.query.sexo;
    let edad = request.query.edad;
    return usersRef
        .child(id)
        .set({
            email: email,
            nombre: nombre,
            sexo: sexo,
            edad: edad
        }).then( response.send({
                status: "1"
        }));
});

/* NUEVAS FUNCIONES */

/*
  OBTENIENDO GASOLINERAS EN UN ÁREA + FILTROS
*/
/*
exports.getGasHG = functions.https.onRequest((request, response) => {
    const url = "https://raw.githubusercontent.com/cesarcano/hg-gasolineras-catalogo/development/listado-combustibles-cre.json?token=AQfzE8r0vhXaovOMBnF5chIijwZN5a4tks5bhBxKwA%3D%3D";
    var creGas = '';
    var keys = [];  
    return gstationsRef.once("value", (snapshot) => {
            httpsReq.get(url, (res) => {
                res.on("data", (subr) => {
                    creGas += subr;
                });
                res.on('end', () => {
                    console.log("ok CRE Catalogo");
                    sortGas(snapshot, creGas);
            }).on("error", (err) => {
                console.log("Error: " + err.message);
                return 0;
            });
        });
    }).then(() => {
        response.send("ok");
    });
});

function sortGas(snapshotJSON, creGas) {
    const regularStr = "Regular";
    const premiumStr = "Premium";
    const dieselStr = "Diésel";
    var cre = JSON.parse(creGas);
    snapshotJSON.forEach(sn => {
        let hgGas = sn.val();
        let combustible = {
            actualizacion: Date.now(),
            cre_id: hgGas.cre_id
        };        ;
       cre.forEach(element => {
            if (hgGas.cre_id === element.Numero) {
                let subprod = "";
                subprod = element.SubProducto;
                if (subprod.indexOf(regularStr) > -1) {
                    combustible.regular =  element.PrecioVigente;
                }
                if (subprod.indexOf(premiumStr) > -1) {
                    combustible.premium = element.PrecioVigente;
                }
                if (subprod.indexOf(dieselStr) > -1) {
                    combustible.diesel = element.PrecioVigente;
                }
            }
        });
        if(Object.keys(combustible).length > 2) {
            console.log(combustible);
            combustiblesRef.child(sn.key).set(combustible).then(() => {
                console.log(hgGas.cre_id + ": OK :D");
            });
        }
        
    });
}

function setServicioDefault(snapGas) {
    //serviciosRef.remove();
    snapGas.forEach(station => {
        serviciosRef.child(station.key).once("value", (snapshot) => {
            if (snapshot.val() === null) {
                serviciosRef.child(station.key).set({
                        atm : "false",
                        shop : "false",
                        wc : "false"
                    });
            }
        });
           
    });
}
*/

exports.getstations =  functions.https.onRequest((request, response) => {
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
    // LLENAR SNAPS GASOLINERAS Y COMENTARIOS
    var snapGas = ''
    var snapCombs = '';
    return gstationsRef.once("value", (snapshot) => {
        snapGas = snapshot;
        //setServicioDefault(snapGas);
    }).then(() => {
        return combustiblesRef.once("value", (snap) => {
            snapCombs = snap;
        }).then(() => {
            let gasArray = '';
            switch (filtro) {
                case "0": //Mapa
                    gasArray = getGasOnMap(lat, lng, distance, marcas, combustibles, snapCombs, snapGas);
                    break;
                case "1": //Ordenados por precio
                    gasArray = getGasByPrecio(lat, lng, distance, marcas, combustibles, snapCombs, snapGas, combustibles[0]);
                    break;
                case "2": // Ordenados por calificacion
                    return comentarioRef.once("value", (comments) => {
                        gasArray = getGasByCalif(lat, lng, distance, marcas, combustibles, snapCombs, snapGas, comments);
                    }).then(() => {
                        return response.send(gasArray);
                    });
                case "3": // Ordenados por distancia
                gasArray = getGasOnMap(lat, lng, distance, marcas, combustibles, snapCombs, snapGas);
                break;
            }
            return response.send(gasArray);
        });
    });

});

function getGasByCalif(lat, lng, distance, marcas_array, combustibles_array, snapCombs, snapGas, comments) {
    var array_gasolineras = [];
        snapGas.forEach(gasolinera => {
            let g = gasolinera.toJSON();
            if (estaCerca(g.lat, g.lng, lat, lng, distance) && esDeLaMarca(g.marca, marcas_array)
                && tieneCombustibles(gasolinera.key, combustibles_array, snapCombs)) {
                    let calificacion = 0;
                    let i = 0;
                    let gasResponse = {
                        id: gasolinera.key,
                        direccion: g.direccion,
                        lat: g.lat,
                        lng: g.lng,
                        marca: g.marca,
                        distancia: calcularDistancia(lat, lng, g.lat, g.lng)
                    }
                    comments.forEach(c => {
                        if (c.val() !== null) {
                            if (gasolinera.key === c.key) {
                                c.forEach(cmt => {
                                    let v = cmt.val();
                                        i++;
                                    calificacion += parseFloat(v.calificacion);
                                });
                            }
                        }
                    });
                    calificacion = calificacion > 0 ? parseFloat(calificacion / i) : calificacion;
                    gasResponse.calificacion =  calificacion > 0 ? parseFloat(calificacion.toFixed(1)): calificacion;
                    snapCombs.forEach(c => {
                        if (c.key === gasolinera.key) {
                            let gsC = c.toJSON();
                            delete gsC.cre_id;
                            gasResponse.combustibles = gsC;
                        }
                    });
                    array_gasolineras.push(gasResponse);
            }
        });        
        array_gasolineras.sort((a, b) => parseFloat(a.calificacion) - parseFloat(b.calificacion));
    return array_gasolineras;
}

function getGasByPrecio(lat, lng, distance, marcas_array, combustibles_array, snapCombs, snapGas, combId) {
    var array_gasolineras = [];
        snapGas.forEach(gasolinera => {
            let g = gasolinera.toJSON();
            if (estaCerca(g.lat, g.lng, lat, lng, distance) && esDeLaMarca(g.marca, marcas_array)
                && tieneCombustibles(gasolinera.key, combustibles_array, snapCombs)) {
                    let gasResponse = {
                        id: gasolinera.key,
                        calificacion: g.calificacion,
                        direccion: g.direccion,
                        lat: g.lat,
                        lng: g.lng,
                        marca: g.marca,
                        distancia: calcularDistancia(lat, lng, g.lat, g.lng)
                    }
                    snapCombs.forEach(c => {
                        if (c.key === gasolinera.key) {
                            let gsC = c.toJSON();
                            delete gsC.cre_id;
                            gasResponse.combustibles = gsC;
                        }
                    });
                    
                    array_gasolineras.push(gasResponse);
            }
        });       
        array_gasolineras.sort((a, b) => parseFloat(a.combustibles[combId]) - parseFloat(b.combustibles[combId]));
    return array_gasolineras;
}

function getGasOnMap(lat, lng, distance, marcas_array, combustibles_array, snapCombs, snapGas) {
    var array_gasolineras = [];
        snapGas.forEach(gasolinera => {
            let g = gasolinera.toJSON();
            if (estaCerca(g.lat, g.lng, lat, lng, distance) && esDeLaMarca(g.marca, marcas_array)
            && tieneCombustibles(gasolinera.key, combustibles_array, snapCombs)) {
                let gasResponse = {
                    id: gasolinera.key,
                    calificacion: g.calificacion,
                    direccion: g.direccion,
                    lat: g.lat,
                    lng: g.lng,
                    marca: g.marca,
                    distancia: calcularDistancia(lat, lng, g.lat, g.lng)
                }
                snapCombs.forEach(c => {
                    if (c.key === gasolinera.key) {
                        let gsC = c.toJSON();
                        delete gsC.cre_id;
                        gasResponse.combustibles = gsC;
                    }
                });
                array_gasolineras.push(gasResponse);
            }
        });        

    array_gasolineras.sort((a, b) => parseFloat(a.distancia) - parseFloat(b.distancia));
    return array_gasolineras;
}
// Evalua si la gasolinera tiene los combustibles
function tieneCombustibles(gID, combustibles_array, snapCombs) {
    let flag = 0;
    snapCombs.forEach(combs => {
        let values = combs.val();
        if (gID === combs.key) {            
            combustibles_array.forEach(combustible => {
                for (let i in values) {
                    if (values.hasOwnProperty(combustible)) {
                        flag += 1;
                    }
                }
            });
        }
    });
    if (flag > 0) {
        return true;
    }
    return false;
}

// Evalua si la gasolinera es de la(s) marca(s) buscada(s)
function esDeLaMarca(gMarca, marcas_array) {
    var flag = 0;
    marcas_array.forEach(marca => {
        if (gMarca === marca) {
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
    rad = function(x) {return x*Math.PI/180;}
    var R = 6378137; //Radio de la tierra en metros
    var dLat = rad( lat2 - lat1 );
    var dLong = rad( lon2 - lon1 );
    var a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLong/2) * Math.sin(dLong/2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    var d = R * c;
    
    return parseInt(d); 
}