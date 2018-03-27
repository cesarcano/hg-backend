const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

exports.adduser = functions.https
    .onRequest((request, response) => {
        const id = request.query.id;
        const email = request.query.email;
        const nombre = request.query.nombre;
        const sexo = request.query.sexo;
        const edad = request.query.edad;
            return admin.database()
                .ref('/users')
                .child(id)
                    .set({
                        email: email, 
                        nombre: nombre,
                        sexo: sexo,
                        edad: edad
                    }).then(
                        response.send(
                            {
                                status: "1"
                            }
                        )
                    );
});

exports.addgstation = functions.https
    .onRequest((request, response) => {
        const id = request.query.id;
        const direccion = request.query.direccion;
        const nombre = request.query.nombre;
        const latitud = request.query.lat;
        const longitud = request.query.lng;
            return admin.database()
                .ref("/gstations")
                .child(id)
                .set({
                        nombre: nombre,
                        marca: "¡Agrega este lugar!",
                        direccion: direccion,
                        latitud: latitud,
                        longitud: longitud
                }).then( response.send(
                    {
                        status: "1"
                    }
                ));
    });