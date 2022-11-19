const express = require('express');
const fs = require('fs');
const sharp = require('sharp');
const ejs = require('ejs');
const sass = require('sass');
const path = require('path');
const { Client } = require('pg');
const formidable = require('formidable');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const session = require('express-session');
const xmljs = require('xml-js');
const request = require('request');
const helmet = require('helmet');


var app = express();
const port = process.env.PORT || 8080;
app.set("view engine", "ejs");


app.use(helmet.frameguard()); //pentru a nu se deschide paginile site-ului in frame-uri



//trec mai jos paginile cu cereri post pe care vreau sa le tratez cu req.body si nu cu formidable
app.use(["/contact"], express.urlencoded({ extended: true }));

//crearea sesiunii (obiectul de tip request capata proprietatea session si putem folosi req.session)
app.use(session({
    secret: 'ab12xzcde23fxzcg', //folosit de express session pentru criptarea id-ului de sesiune
    resave: true,
    saveUninitialized: false
}));


app.use("/*", function(req, res, next) {
    res.locals.utilizator = req.session.utilizator;

    next();
});

// var client = new Client({
//     user: "wupkgabvvfnbjv",
//     password: '7ae44c0d17f5050db2e3dc2b8c54ba3b9eecf4ff78c140e91b2b999039f39aa5',
//     host: 'ec2-54-89-105-122.compute-1.amazonaws.com',
//     port: 5432,
//     database: 'd9bvsv9ta5db70',
//     ssl: {
//         rejectUnauthorized: false
//     }
// });


if (process.env.SITE_ONLINE) {
    protocol = "https://";
    numeDomeniu = "afternoon-mesa-21541.herokuapp.com"
    client = new Client({
        user: "wupkgabvvfnbjv",
        password: '7ae44c0d17f5050db2e3dc2b8c54ba3b9eecf4ff78c140e91b2b999039f39aa5',
        host: 'ec2-54-89-105-122.compute-1.amazonaws.com',
        port: 5432,
        database: 'd9bvsv9ta5db70',
        ssl: {
            rejectUnauthorized: false
        }
    });

} else {
    var client = new Client({ user: "ivan334", password: 'stefan334', host: 'localhost', port: 5432, database: 'party-bucharest' });
    protocol = "http://";
    numeDomeniu = "localhost:8080";
}


client.connect();


var ipuri_active = {};


app.use(function(req, res, next) {
    let ipReq = getIp(req);
    let ip_gasit = ipuri_active[ipReq + "|" + req.url];
    //console.log("=================", ip_gasit, ipuri_blocate);
    timp_curent = new Date();
    if (ip_gasit) {

        if ((timp_curent - ip_gasit.data) < 20 * 1000) { //diferenta e in milisecunde; verific daca ultima accesare a fost pana in 10 secunde
            if (ip_gasit.nr > 10) { //mai mult de 10 cereri 
                res.send("<h1>Prea multe cereri intr-un interval scurt.</h1>");
                ip_gasit.data = timp_curent
                return;
            } else {

                ip_gasit.data = timp_curent;
                ip_gasit.nr++;
            }
        } else {
            
            ip_gasit.data = timp_curent;
            ip_gasit.nr = 1; 
        }
    } else {

        ipuri_active[ipReq + "|" + req.url] = { nr: 1, data: timp_curent };


    }
    let comanda_param = `insert into accesari(ip, user_id, pagina) values ($1::text, $2,  $3::text)`;
    
    if (ipReq) {
        var id_utiliz = req.session.utilizator ? req.session.utilizator.id : null;
        
        client.query(comanda_param, [ipReq, id_utiliz, req.url], function(err, rez) {
            if (err) console.log(err);
        });
    }
    next();
});

function stergeAccesariVechi() {
    let comanda = `delete from accesari where now() - data_accesare > interval '1440 minutes'`;
  
    client.query(comanda, function(err, rez) {
        if (err) console.log(err);
    });
    let timp_curent = new Date();
    for (let ipa in ipuri_active) {
        if (timp_curent - ipuri_active[ipa].data > 2 * 60 * 1000) { 
            console.log("Am deblocat ", ipa);
            delete ipuri_active[ipa];
        }
    }
}


setInterval(stergeAccesariVechi, 10 * 60 * 1000);









app.get("/femei", function(req, res) {

    var conditie = `where 1=1 `;
    console.log(req.query.tip);
    if (req.query.tip) {
        conditie += `and category='{${req.query.tip}}'`;
    }

    client.query(`SELECT * FROM PRODUSE ` + conditie, function(err, rez) {
        console.log(rez.rows);
        res.render("pagini/femei.ejs", { produse: rez.rows });
        console.log("Am trimis");
    });

});

app.get("/femei/:id", function(req, res) {
    console.log(req.params);

    client.query(`SELECT * FROM PRODUSE where id=${req.params.id}`, function(err, rez) {
        console.log("inauntru select");
        res.render("pagini/produs", { prod: rez.rows[0] });

    });


});


app.use("/Resources", express.static(__dirname + "/Resources"));


function createImages() {
    var buf = fs.readFileSync(__dirname + "/Resources/Jsons/galerie.json").toString("utf-8");
    obImagini = JSON.parse(buf); //global
    console.log(obImagini);
    for (let imag of obImagini.imagini) {
        // console.log("a intrat")
        let nume_imag, extensie;
        [nume_imag, extensie] = imag.cale_imagine.split(".");
        let dim_mic = 150;
        let dim_medie = 500;

        imag.mic = `${obImagini.cale_galerie}/mic/${nume_imag}-${dim_mic}.webp`;
        imag.medie = `${obImagini.cale_galerie}/medie/${nume_imag}-${dim_medie}.webp`

        imag.mare = `${obImagini.cale_galerie}/${nume_imag}.jpg`

        if (!fs.existsSync(imag.mic)) {
            console.log(__dirname + "/" + imag.mare);
            sharp(__dirname + "/" + imag.mare).resize(dim_mic).toFile(__dirname + "/" + imag.mic);
        }
        if (!fs.existsSync(imag.medie)) {
            console.log(__dirname + "/" + imag.mare);
            sharp(__dirname + "/" + imag.mare).resize(dim_medie).toFile(__dirname + "/" + imag.medie);
        }

    }


}


function chooseImages() {
    var date = new Date();
    var today = Date.parse('01/01/2011 ' + date.getHours() + ':' + date.getMinutes());
    var timp1, timp2;
    for (let i = 0; i < obImagini.imagini.length; i++) {

        [timp1, timp2] = obImagini.imagini[i].timp.split("-");
       
        if (!(today >= Date.parse('01/01/2011 ' + timp1) && today <= Date.parse('01/01/2011 ' + timp2))) {
            obImagini.imagini.splice(i, 1);
            i--;
        }
    }
}
createImages();
chooseImages();



function getIp(req) { //pentru Heroku
    var ip = req.headers["x-forwarded-for"];
    if (ip) {
        let vect = ip.split(",");
        return vect[vect.length - 1];
    } else if (req.ip) {
        return req.ip;
    } else {
        return req.connection.remoteAddress;
    }
}



app.get(["/", "/index", "/home"], function(req, res) {   
        var evenimente = []
        var locatie = "";

        request('https://secure.geobytes.com/GetCityDetails?key=7c756203dbb38590a66e01a5a3e1ad96&fqcn=109.99.96.15', //se inlocuieste cu req.ip; se testeaza doar pe Heroku
            function(error, response, body) {
                if (error) { console.error('error:', error) } else {
                    var obiectLocatie = JSON.parse(body);
                    locatie = obiectLocatie.geobytescountry + " " + obiectLocatie.geobytesregion
                }
                var texteEvenimente = ["Eveniment important", "Festivitate", "Promotie", "Reduceri"];
                dataCurenta = new Date();
                for (i = 0; i < texteEvenimente.length; i++) {
                    evenimente.push({ data: new Date(dataCurenta.getFullYear(), dataCurenta.getMonth(), Math.ceil(Math.random() * 27)), text: texteEvenimente[i] });
                }
                const dataTest = new Date(dataCurenta.getFullYear(), dataCurenta.getMonth() + 2, 0);
                evenimente.push({ data: new Date(dataCurenta.getFullYear(), dataCurenta.getMonth(), dataTest.getDay()), text: "Reducere Produse" });
                console.log(evenimente)

                const data = new Date();

                res.render("pagini/index", { evenimente: evenimente, oraServer: data.getHours(), locatie: locatie, ip: getIp(req), imagini: obImagini.imagini, cale: obImagini.cale_galerie + "/", mesajLogin: req.session.mesajLogin });
                req.session.mesajLogin = null;

            });

});



////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////// Administrarea utilizatorilor (inregistrare, login, logout, update profil)

sirAlphaNum = "";
v_intervale = [
    [48, 57],
    [65, 90],
    [97, 122]
];
for (let interval of v_intervale) {
    for (let i = interval[0]; i <= interval[1]; i++)
        sirAlphaNum += String.fromCharCode(i);
}

function genereazaToken(lungime) {
    sirAleator = "";
    for (let i = 0; i < lungime; i++) {
        sirAleator += sirAlphaNum[Math.floor(Math.random() * sirAlphaNum.length)];
    }
    return sirAleator
}




async function trimiteMail(nume, prenume, username, email, token) {
    var transp = nodemailer.createTransport({
        service: "yahoo",
        secure: false,
        auth: { //date login 
            user: "nullshop334@yahoo.com",
            pass: "hkpeqwfakxadyqhw"
        },
        tls: {
            rejectUnauthorized: false
        }
    });
    //genereaza html
    await transp.sendMail({
        from: "nullshop334@yahoo.com",
        to: email,
        subject: "Salut " + nume + " " + prenume,
        text: "Salut " + username,
        html: `<h1>Salut!</h1><p style='color:blue'>Te-ai inregistrat pe <a href = 'http://${numeDomeniu}'>NULLShop</a> cu username-ul <i>${username}<i>.</p> <p><a href='http://${numeDomeniu}/confirmare_mail/${token}/${username}'>Click aici pentru confirmare</a></p>`,
    })
    console.log("trimis mail");
}

async function trimiteMailResetParola(email, token) {
    var transp = nodemailer.createTransport({
        service: "yahoo",
        secure: false,
        auth: { //date login 
            user: "nullshop334@yahoo.com",
            pass: "hkpeqwfakxadyqhw"
        },
        tls: {
            rejectUnauthorized: false
        }
    });
    //genereaza html
    await transp.sendMail({
        from: "nullshop334@yahoo.com",
        to: email,
        subject: "Salut",
        text: "Salut",
        html: `<h1>Salut!</h1><p style='color:blue'>Pare ca ai uitat parola de pe pe <a href = 'http://${numeDomeniu}'>NULLShop</a>. </p> <p>Asa ca am schimbat-o cu ${token}</p>`,
    })
    console.log("trimis mail");
}


//Este un salt (string) folosit pentru criptarea parolelor din tabelul de utilizatori:
parolaCriptare = "curs_tehnici_web";




app.get("/confirmare_mail/:token/:username", function(req, res) {
    var queryUpdate = `update utilizatori set confirmat_mail=true where username = '${req.params.username}' and cod= '${req.params.token}' `;
    client.query(queryUpdate, function(err, rez) {
        if (err) {
            console.log(err);
            res.render("pagini/eroare", { err: "Eroare baza date" });
            return;
        }
        if (rez.rowCount > 0) {
            res.render("pagini/confirmare");
        } else {
            res.render("pagini/eroare", { err: "Eroare link" });
        }
    });

});


app.post("/inreg", function(req, res) {
    var formular = new formidable.IncomingForm();
    var username;
    formular.parse(req, function(err, campuriText, campuriFile) { //4
        console.log(campuriText);
        console.log("Email: ", campuriText.email);

        var eroare = "";
        if (!campuriText.username) 
            eroare += "Username-ul nu poate fi necompletat. ";


        if (!campuriText.username.match("^(?=.*[0-9])(?=.*[a-z]).{8,32}$"))//TODO: change this
            eroare += "Username-ul trebuie sa conțină minim 8 caractere, sa aiba minim o cifra si minim un caracter lowercase";
        if (eroare != "") {
            res.render("pagini/inregistrare", { err: eroare });
            return;
        }
        queryVerifUtiliz = ` select * from utilizatori where username= '${campuriText.username}' `;
        client.query(queryVerifUtiliz, function(err, rez) {
            if (err) {
                console.log(err);
                res.render("pagini/inregistrare", { err: "Eroare baza date" });
            } else {
                if (rez.rows.length == 0) {

                    var criptareParola = crypto.scryptSync(campuriText.parola, parolaCriptare, 32).toString('hex');
                    var token = genereazaToken(Math.random() * 11 + 40);
                    var timestamp = Date.now();
                    token = timestamp + token;

                    var queryUtiliz = `insert into utilizatori (username, nume, prenume, parola, email, cod, imagine) values ('${campuriText.username}','${campuriText.nume}','${campuriText.prenume}', $1 ,'${campuriText.email}','${token}', '/Resources/poze_uploadate/${username}/poza.jpg')`;

                    console.log(queryUtiliz, criptareParola);
                    client.query(queryUtiliz, [criptareParola], function(err, rez) {
                        if (err) {
                            console.log(err);
                            res.render("pagini/inregistrare", { err: "Eroare baza date" });
                        } else {
                            trimiteMail(campuriText.nume, campuriText.prenume, campuriText.username, campuriText.email, token);
                            res.render("pagini/inregistrare", { err: "", raspuns: "Date introduse" });
                        }
                    });
                } else {
                    eroare += "Username-ul mai exista. ";
                    res.render("pagini/inregistrare", { err: eroare });
                }
            }
        });
    });
    formular.on("field", function(nume, val) {
        console.log("----> ", nume, val);
        if (nume == "username")
            username = val;
    })
    formular.on("fileBegin", function(nume, fisier) { //2
        if (!fisier.originalFilename)
            return;
        folderUtilizator = __dirname + "/Resources/poze_uploadate/" + username + "/";
        console.log("----> ", nume, fisier);
        if (!fs.existsSync(folderUtilizator)) {
            fs.mkdirSync(folderUtilizator);
            v = fisier.originalFilename.split(".");
            fisier.filepath = folderUtilizator + "poza." + v[v.length - 1]; 
          
        }

    })
    formular.on("file", function(nume, fisier) { //3

        console.log("fisier uploadat");
    });


});

app.post("/login", function(req, res) {
    var formular = new formidable.IncomingForm();

    formular.parse(req, function(err, campuriText, campuriFile) {
        console.log(campuriText);

        var querylogin = `select * from utilizatori where username= '${campuriText.username}' `;
        client.query(querylogin, function(err, rez) {
            if (err) {
                res.render("pagini/eroare", { mesaj: "Eroare baza date. Incercati mai tarziu." });
                return;
            }
            if (rez.rows.length != 1) { //ar trebui sa fie 0
                res.render("pagini/eroare", { mesaj: "Username-ul nu exista." });
                return;
            }
            var criptareParola = crypto.scryptSync(campuriText.parola, parolaCriptare, 32).toString('hex');
            console.log(criptareParola);
            console.log(rez.rows[0].parola);
            if (criptareParola == rez.rows[0].parola && rez.rows[0].confirmat_mail) {
                console.log("totul ok");
                req.session.mesajLogin = null; //resetez in caz ca s-a logat gresit ultima oara
                if (req.session) {
                    req.session.utilizator = {
                        id: rez.rows[0].id,
                        username: rez.rows[0].username,
                        nume: rez.rows[0].nume,
                        prenume: rez.rows[0].prenume,
                        email: rez.rows[0].email,
                        rol: rez.rows[0].rol,
                        imagine: rez.rows[0].imagine
                    }
                }
              
                res.redirect("/index");
            } else {
                req.session.mesajLogin = "Login esuat";
                res.redirect("/index");
           }

        });


    });
});

app.post("/profil", function(req, res) {
    var username;
    console.log("profil");
    if (!req.session.utilizator) {
        res.render("pagini/eroare", { mesaj: "Nu sunteti logat." });
        return;
    }
    var formular = new formidable.IncomingForm();

    formular.parse(req, function(err, campuriText, campuriFile) {
        console.log(err);
        console.log(campuriText);
        var criptareParola = crypto.scryptSync(campuriText.parola, parolaCriptare, 32).toString('hex');
        username = campuriText.username;

        var queryUpdate = `update utilizatori set nume=$1::text, prenume=$2::text, email=$3::text, culoare_chat=$4::text where username= $5::text and parola=$6::text `;

        client.query(queryUpdate, [campuriText.nume, campuriText.prenume, campuriText.email, campuriText.culoareText, req.session.utilizator.username, criptareParola], function(err, rez) {
            if (err) {
                console.log(err);
                res.render("pagini/eroare", { mesaj: "Eroare baza date. Incercati mai tarziu." });
                return;
            }
            console.log(rez.rowCount);
            if (rez.rowCount == 0) {
                res.render("pagini/profil", { mesaj: "Update-ul nu s-a realizat. Verificati parola introdusa." });
                return;
            }

            req.session.utilizator.nume = campuriText.nume;
            req.session.utilizator.prenume = campuriText.prenume;
            req.session.utilizator.imagine = campuriFile.imagine;

            req.session.utilizator.culoare_chat = campuriText.culoareText;
            req.session.utilizator.email = campuriText.email;

            res.render("pagini/profil", { mesaj: "Update-ul s-a realizat cu succes." });

        });


    });
    formular.on("field", function(nume, val) {
        console.log("----> ", nume, val);
        if (nume == "username")
            username = val;
    })
    formular.on("fileBegin", function(nume, fisier) { //2

        folderUtilizator = __dirname + "/Resources/poze_uploadate/" + "admin2/";
        console.log("Utilizatorul este: " + req.session.utilizator.username);
        console.log("----> ", nume, fisier);
        if (!fs.existsSync(folderUtilizator)) {
            fs.mkdirSync(folderUtilizator);
            v = fisier.originalFilename.split(".");
            fisier.filepath = folderUtilizator + "poza." + v[v.length - 1]; //setez calea de upload
         
        }

    })
    formular.on("file", function(nume, fisier) { 
        
        console.log("fisier uploadat");
    });
});


app.get("/logout", function(req, res) {
    req.session.destroy();
    res.locals.utilizator = null;
    res.render("pagini/logout");
});


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////// Pagini/cereri pentru admin

app.get('/useri', function(req, res) {

    if (req.session && req.session.utilizator && req.session.utilizator.rol == "admin") {
        client.query("select * from events", function(err, rezultat) {
            if (err) throw err;
           
            res.render('pagini/useri', { events: rezultat.rows });
        });
    } else {
        res.status(403).render('pagini/eroare', { mesaj: "Nu aveti acces" });
    }

});




app.post("/sterge_utiliz", function(req, res) {
    if (req.session && req.session.utilizator && req.session.utilizator.rol == "admin") {
        var formular = new formidable.IncomingForm()

        formular.parse(req, function(err, campuriText, campuriFisier) {
          
            var token = genereazaToken(7);
            var criptareParola = crypto.scryptSync(token, parolaCriptare, 32).toString('hex');

            var comanda = `update utilizatori set parola = $3::text where id=$1 and rol !='admin' and nume!= $2::text `;
            var comanda2 = `select email from utilizatori where id =${campuriText.id_utiliz}`;
            client.query(comanda, [campuriText.id_utiliz, "Mihai", criptareParola], function(err, rez) {
                // TO DO mesaj cu stergerea
                if (err)
                    console.log(err);
                else {
                    if (rez.rowCount > 0) {
                        console.log("Resetat cu succes");
                    } else {
                        console.log("Resetare esuata");
                    }
                }
            });
            client.query(comanda2, function(err, rez) {
                // TO DO mesaj cu stergerea
                if (err)
                    console.log(err);
                else {
                    if (rez.rowCount > 0) {
                        for (let email of rez.rows) {
                            console.log("Resetat cu succes " + email.email);
                            trimiteMailResetParola(email.email, token);
                        }
                    } else {
                        console.log("Resetare esuata");
                    }
                }
            });

        });
    }
    res.redirect("/useri");

});

app.post("/addEvent", function(req,res){ 
    var formular = new formidable.IncomingForm()
    formular.parse(req, function(err, campuriText, campuriFisier) {
        var comanda = `INSERT INTO public.events(
            category, indoor, cost, description, image, name, starting)
            VALUES ($1::text, $2::boolean, $3, $4::text, $5::text, $6::text, $7::date);`;

            client.query(comanda, [campuriText.category, campuriText.indoor, campuriText.cost, campuriText.description, 
                campuriText.image, campuriText.name, campuriText.starting], function(err, rez) {
                if (err)
                    console.log(err);
                else {
                    if (rez.rowCount > 0) {
                        console.log("Introdus cu success");
                    } else {
                        console.log("Introducerea a esuat");
                    }
                }
            });

    });
    res.redirect("/useri");
});


app.post("/deleteEvent", function(req,res){
    if (req.session && req.session.utilizator && req.session.utilizator.rol == "admin") {
        var formular = new formidable.IncomingForm()

        formular.parse(req, function(err, campuriText, campuriFisier) {
        

            var comanda = `INSERT INTO old_events (id, category, indoor, cost, description, image, name, starting)
            SELECT id, category, indoor, cost, description, image, name, starting
            FROM events
            WHERE id=$1;`
            
           var comanda2=  `DELETE FROM events
            WHERE id=$1; `;
            
            client.query(comanda, [campuriText.id_event], function(err, rez) {
                // TO DO mesaj cu stergerea
                if (err)
                    console.log(err);
                else {
                    if (rez.rowCount > 0) {
                        console.log("Adaugat in old events cu succes");
                    } else {
                        console.log("Adaugat esuata");
                    }
                }
            });
            client.query(comanda2, [campuriText.id_event], function(err, rez) {
                // TO DO mesaj cu stergerea
                if (err)
                    console.log(err);
                else {
                    if (rez.rowCount > 0) {
                        console.log("Stergere din events cu succes");
                    } else {
                        console.log("Stergere esuata");
                    }
                }
            });

        });
    }
    res.redirect("/useri");
});

///////////////////////////////////////////////////////////////////////////////////////////////
//////////////// Contact
caleXMLMesaje = "resources/xml/contact.xml";
headerXML = `<?xml version="1.0" encoding="utf-8"?>`;

function creeazaXMlContactDacaNuExista() {
    if (!fs.existsSync(caleXMLMesaje)) {
        let initXML = {
            "declaration": {
                "attributes": {
                    "version": "1.0",
                    "encoding": "utf-8"
                }
            },
            "elements": [{
                "type": "element",
                "name": "contact",
                "elements": [{
                    "type": "element",
                    "name": "mesaje",
                    "elements": []
                }]
            }]
        }
        let sirXml = xmljs.js2xml(initXML, { compact: false, spaces: 4 });
        console.log(sirXml);
        fs.writeFileSync(caleXMLMesaje, sirXml);
        return false; //l-a creat
    }
    return true; //nu l-a creat acum
}


function parseazaMesaje() {
    let existaInainte = creeazaXMlContactDacaNuExista();
    let mesajeXml = [];
    let obJson;
    if (existaInainte) {
        let sirXML = fs.readFileSync(caleXMLMesaje, 'utf8');
        obJson = xmljs.xml2js(sirXML, { compact: false, spaces: 4 });


        let elementMesaje = obJson.elements[0].elements.find(function(el) {
            return el.name == "mesaje"
        });
        let vectElementeMesaj = elementMesaje.elements ? elementMesaje.elements : [];
        console.log("Mesaje: ", obJson.elements[0].elements.find(function(el) {
            return el.name == "mesaje"
        }))
        let mesajeXml = vectElementeMesaj.filter(function(el) { return el.name == "mesaj" });
        return [obJson, elementMesaje, mesajeXml];
    }
    return [obJson, [],
        []
    ];
}


app.get("/contact", function(req, res) {
    let obJson, elementMesaje, mesajeXml;
    [obJson, elementMesaje, mesajeXml] = parseazaMesaje();

    res.render("pagini/contact", { utilizator: req.session.utilizator, mesaje: mesajeXml })
});

app.post("/contact", function(req, res) {
    let obJson, elementMesaje, mesajeXml;
    [obJson, elementMesaje, mesajeXml] = parseazaMesaje();

    let u = req.session.utilizator ? req.session.utilizator.username : "anonim";
    let mesajNou = {
        type: "element",
        name: "mesaj",
        attributes: {
            username: u,
            data: new Date()
        },
        elements: [{ type: "text", "text": req.body.mesaj }]
    };
    if (elementMesaje.elements)
        elementMesaje.elements.push(mesajNou);
    else
        elementMesaje.elements = [mesajNou];
    console.log(elementMesaje.elements);
    let sirXml = xmljs.js2xml(obJson, { compact: false, spaces: 4 });
    console.log("XML: ", sirXml);
    fs.writeFileSync("resources/xml/contact.xml", sirXml);

    res.render("pagini/contact", { utilizator: req.session.utilizator, mesaje: elementMesaje.elements })
});







///////////////////////////////////////////////////////////////////////////////////////////////
////////////// Cereri generale

app.get("/favicon.ico", function(req, res) {
    res.sendFile("/Resources/imagini/favicon.ico");
});


app.get("/*.ejs", function(req, res) {
    res.status(403).render("pagini/403");
});

app.get("/*", function(req, res) {
    console.log(req.url);
    res.render("pagini" + req.url, function(err, rezultatRender) {

        if (err) {

            if (err.message.includes("Failed to lookup")) {
                res.status(404).render("pagini/404");

            } else if (err) {
                console.log("AM INTRAT IN ELSE " + err);
                res.render("pagini/404");
            }
            console.log("AM IESIT DIN ELSE SI RES ARE VALOAREA:" + res);

        }
        res.send(rezultatRender);
    });

});




app.listen(port);

console.log("Serverul a pornit");