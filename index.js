/**
 * Student Name: Aishmeen kaur
 * Student id 415076
 * Student Name Kuljit kaur
 */


/**
 * Initialization
 * Here we import, declare and initialize variables and objects
 */
const express = require('express');
const session = require('express-session');
const sql = require('mssql');
const app = express();
const port = 3000;
const sqlConnectionString = 'Server=localhost,1433;Database=coworking;User Id=admin;Password=@Passw0rd;TrustServerCertificate=True;';


/**
 * Configuration
 * This section sets configuration for various objects
 */
app.use(session({
    secret: 'some random secret' // Secret
}))
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('view engine', 'ejs');
app.set('json spaces', 2)


/**
 * autoLogin Middleware
 * Automatically login a user on valid session
 * @param req - session request
 * @param res - session response
 * @param next - next callback in chain
 */
function autoLogin(req, res, next) {
    if (req.session.user) {
       if (req.session.user.role === 'owner') {
           res.redirect('/owner'); // Owner Dashboard
       } else
           res.redirect('/coworker'); // Coworker Dashboard
    }
    else next();
}


/**
 * checkAuth Middleware
 * Checks if a user session is valid or not
 * @param req - session request
 * @param res - session response
 * @param next - next callback in chain
 */
function checkAuth(req, res, next) {
    if (req.session.user) {
        data.navItems = [req.session.user.email, 'Logout'];
        data.navPaths = ['', '/logout'];
        next()
    } else {
        res.status(401).render('errors/401', data);
    }
}


/**
 * Data
 * All other data necessary for website is described here
 *
 * @reference
 * User object contains following fields
 * user = {
 *     name: '',
 *     email: '',
 *     password: '',
 *     phone: '',
 *     role: '',
 *     properties: {}
 * }
 *
 * @reference
 * Property object contains following fields
 * property = {
 *    id: 0, // 0 -> number, '' -> string
 *    address: '',
 *    neighborhood: '',
 *    area: '', // square feet
 *    garage: '',
 *    transit: '' // public transport access,
 *    workspaces: []
 * }
 *
 * @reference
 * Workspace object contains following fields
 * workspace = {
 *    id: 0,
 *    type: '', // meeting room, private office or open seating area etc.
 *    location: '', // indoor or outdoor
 *    seats: '',
 *    smoking: '',
 *    availability: '', // date
 *    term: '', // day, week or month
 *    price: ''
 * }
 *
 * @storage
 * Following data is saved in DB:
 *  Users,
 *  Properties,
 *  propertyID,
 *  workspaceID
 *
 */
let Users;
let Properties;
let propertyID;
let workspaceID;

let propertyQueries = [
    'address',
    'neighborhood',
    'area',
    'garage',
    'transit'
];

const data = {
    navItems: ['Login', 'Register'],
    navPaths: ['/login', '/register'],
    invalidCredentialsError: '',
    existingUserError: ''
}

let conn;


/**
 * Routes
 * This section defines all the routes of website
 */
app.get('/', autoLogin, (req, res) => { // Home Page
    res.render('index', data);
})

app.get('/login', autoLogin, (req, res) => { // Login Page
    data.invalidCredentialsError = '';
    res.render('login', data);
})

app.post('/login', (req, res) => { // Login User
    if(Users.filter(user => user.email === req.body.email && user.password === req.body.password).length) {
        req.session.user = Users.filter(user => user.email === req.body.email && user.password === req.body.password)[0]; // Only First Match
        if(req.session.user.role === 'owner') {
            res.redirect('/owner');
        } else res.redirect('/coworker');
    }
    else {
        data.invalidCredentialsError = 'Invalid credentials. Please check.';
        res.render('login', data);
    }
})

app.get('/register', autoLogin, (req, res) => { // Register Page
    data.existingUserError = '';
    res.render('register', data);
})

app.post('/register', async (req, res) => { // Create User
    if (Users.filter(user => user.email === req.body.email).length) {
        data.existingUserError = 'User already exist. Change email.';
        res.render('register', data);
    } else {
        Users.push(req.body);
        try {
            await sql.connect(sqlConnectionString);
            const result = await sql.query(`UPDATE data SET users = '${JSON.stringify(Users)}' WHERE _id = 1`);
            console.log(result);
        } catch (err) {
            console.error(err);
        }

        req.session.user = req.body;
        if (req.session.user.role === 'owner') {
            res.redirect('/owner');
        } else res.redirect('/coworker');
    }
})

app.get('/owner', checkAuth, (req, res) => {
    if (req.session.user.role === 'owner') {
        data.Properties = Properties[req.session.user.email];
        res.render('owner', data);
    }
    else res.status(403).render('errors/403', data);
})

app.get('/owner/property/create', checkAuth, (req, res) => {
    if (req.session.user.role === 'owner') {
        res.render('property/create', data);
    }
    else res.status(403).render('errors/403', data);
})

app.post('/owner/property/create', checkAuth, async (req, res) => {
    if (req.session.user.role === 'owner') {
        propertyID++;
        const property = {
            id: propertyID,
            address: req.body.address.toLowerCase(),
            neighborhood: req.body.neighborhood.toLowerCase(),
            area: req.body.area.toLowerCase(),
            garage: req.body.garage.toLowerCase(),
            transit: req.body.transit.toLowerCase(),
        }
        if (Properties.hasOwnProperty(req.session.user.email)) {
            Properties[req.session.user.email].push(property);
        } else {
            Properties[req.session.user.email] = [property];
        }
        try {
            await sql.connect(sqlConnectionString);
            const result = await sql.query(`UPDATE data SET properties = '${JSON.stringify(Properties)}', property_id = ${propertyID} WHERE _id = 1`);
            console.log(result);
        } catch (err) {
            console.error(err);
        }
        res.redirect('/owner');
    } else res.status(403).render('errors/403', data);
})

app.get('/owner/property/:id/edit', checkAuth, (req, res) => {
    if (req.session.user.role === 'owner') {
        if(Properties !== undefined && Properties.hasOwnProperty(req.session.user.email)) {
            data.property = Properties[req.session.user.email].filter(property => property.id === parseInt(req.params.id))[0];
            if(data.property && Object.keys(data.property).length){
                res.render('property/edit', data);
            } else res.redirect('/owner');
        } else res.redirect('/owner');
    }
    else res.status(403).render('errors/403', data);
})

app.post('/owner/property/:id/edit', checkAuth, async (req, res) => {
    if (req.session.user.role === 'owner') {
        Properties[req.session.user.email].forEach(property => {
            if (property.id === parseInt(req.params.id)) {
                property.address = req.body.address.toLowerCase();
                property.neighborhood = req.body.neighborhood.toLowerCase();
                property.area = req.body.area.toLowerCase();
                property.garage = req.body.garage.toLowerCase();
                property.transit = req.body.transit.toLowerCase();
            }
        });
        try {
            await sql.connect(sqlConnectionString);
            const result = await sql.query(`UPDATE data SET properties = '${JSON.stringify(Properties)}' WHERE _id = 1`);
            console.log(result);
        } catch (err) {
            console.error(err);
        }
        res.redirect('/owner');
    } else res.status(403).render('errors/403', data);
})

app.get('/owner/property/:id/delete', checkAuth, async (req, res) => {
    if (req.session.user.role === 'owner') {
        if (Properties !== undefined && Properties.hasOwnProperty(req.session.user.email)) {
            let removeIndex;
            Properties[req.session.user.email].forEach((property, index) => {
                if (property.id === parseInt(req.params.id)) {
                    removeIndex = index;
                }
            });
            Properties[req.session.user.email].splice(removeIndex, 1);
            if (Properties[req.session.user.email].length === 0) {
                delete Properties[req.session.user.email];
            }
        }
        try {
            await sql.connect(sqlConnectionString);
            const result = await sql.query(`UPDATE data SET properties = '${JSON.stringify(Properties)}' WHERE _id = 1`);
            console.log(result);
        } catch (err) {
            console.error(err);
        }
        res.redirect('/owner');
    } else res.status(403).render('errors/403', data);
})

app.get('/owner/workspace/create', checkAuth, (req, res) => {
    if (req.session.user.role === 'owner') {
        data.ownedProperties = []
        if(Properties !== undefined && Properties.hasOwnProperty(req.session.user.email)) {
            Properties[req.session.user.email].forEach((property, index) => {
                data.ownedProperties.push({
                    propertyIndex: index,
                    propertyName: property.address
                })
            });
        }
        res.render('workspace/create', data);
    }
    else res.status(403).render('errors/403', data);
})

app.post('/owner/workspace/create', checkAuth, async (req, res) => {
    if (req.session.user.role === 'owner') {
        workspaceID++;
        const workspace = {
            id: workspaceID,
            type: req.body.type.toLowerCase(),
            location: req.body.location.toLowerCase(),
            seats: req.body.seats.toLowerCase(),
            smoking: req.body.smoking.toLowerCase(),
            availability: req.body.availability.toLowerCase(),
            term: req.body.term.toLowerCase(),
            price: req.body.price.toLowerCase(),
        }

        if (Properties[req.session.user.email][req.body.property].hasOwnProperty('workspaces')) {
            Properties[req.session.user.email][req.body.property]['workspaces'].push(workspace);
        } else {
            Properties[req.session.user.email][req.body.property]['workspaces'] = [workspace];
        }
        try {
            await sql.connect(sqlConnectionString);
            const result = await sql.query(`UPDATE data SET properties = '${JSON.stringify(Properties)}', workspace_id = ${workspaceID} WHERE _id = 1`);
            console.log(result);
        } catch (err) {
            console.error(err);
        }
        res.redirect('/owner');
    } else res.status(403).render('errors/403', data);
})

app.get('/owner/workspace/:id/edit', checkAuth, (req, res) => {
    if (req.session.user.role === 'owner') {
        if(Properties !== undefined && Properties.hasOwnProperty(req.session.user.email)) {
            Properties[req.session.user.email].forEach(property => {
                if(property.hasOwnProperty('workspaces')){
                    property.workspaces.forEach(workspace => {
                        if(workspace.id === parseInt(req.params.id)){
                            data.workspace = workspace;
                        }
                    })
                }
            })
            if(data.workspace && Object.keys(data.workspace).length){
                res.render('workspace/edit', data)
            } else res.redirect('/owner');
        }
        else res.redirect('/owner');
    }
    else res.status(403).render('errors/403', data);
})

app.post('/owner/workspace/:id/edit', checkAuth, async (req, res) => {
    if (req.session.user.role === 'owner') {
        Properties[req.session.user.email].forEach(property => {
            if (property.hasOwnProperty('workspaces')) {
                property.workspaces.forEach(workspace => {
                    if (workspace.id === parseInt(req.params.id)) {
                        workspace.type = req.body.type.toLowerCase();
                        workspace.location = req.body.location.toLowerCase();
                        workspace.seats = req.body.seats.toLowerCase();
                        workspace.smoking = req.body.smoking.toLowerCase();
                        workspace.availability = req.body.availability.toLowerCase();
                        workspace.term = req.body.term.toLowerCase();
                        workspace.price = req.body.price.toLowerCase();
                    }
                })
            }
        });
        try {
            await sql.connect(sqlConnectionString);
            const result = await sql.query(`UPDATE data SET properties = '${JSON.stringify(Properties)}' WHERE _id = 1`);
            console.log(result);
        } catch (err) {
            console.error(err);
        }
        res.redirect('/owner');
    } else res.status(403).render('errors/403', data);
})

app.get('/owner/workspace/:id/delete', checkAuth, async (req, res) => {
    if (req.session.user.role === 'owner') {
        if (Properties !== undefined && Properties.hasOwnProperty(req.session.user.email)) {
            Properties[req.session.user.email].forEach(property => {
                if (property.hasOwnProperty('workspaces')) {
                    let removeIndex;
                    property.workspaces.forEach((workspace, index) => {
                        if (workspace.id === parseInt(req.params.id)) {
                            removeIndex = index;
                        }
                    });
                    property.workspaces.splice(removeIndex, 1);
                    if (property.workspaces.length === 0) {
                        delete property.workspaces;
                    }
                }
            })
        }
        try {
            await sql.connect(sqlConnectionString);
            const result = await sql.query(`UPDATE data SET properties = '${JSON.stringify(Properties)}' WHERE _id = 1`);
            console.log(result);
        } catch (err) {
            console.error(err);
        }
        res.redirect('/owner');
    } else res.status(403).render('errors/403', data);
})

function getSpaces() {
    const spacePrototype = {
        email: '',
        name: '',
        phone: '',
        properties: []
    }
    data.Spaces = [];
    let space;
    Object.keys(Properties).forEach(key => {
        Users.forEach(user => {
            if(user.email === key){
                space = Object.create(spacePrototype);
                space.email = user.email;
                space.name = user.name;
                space.phone = user.phone;
                space.properties = Properties[key];
                data.Spaces.push(space);
            }
        })
    })
}

app.get('/coworker', checkAuth, (req, res) => {
    getSpaces();
    res.render('coworker', data);
})

app.get('/search', checkAuth, (req, res) => {
    if (Object.keys(req.query).length === 0){
        getSpaces();
    } else if (Object.keys(req.query).length === 1 && propertyQueries.includes(Object.keys(req.query)[0])) {
        getSpaces();
        let query = Object.keys(req.query)[0];
        let value = Object.values(req.query)[0];

        let filtered = [];
        data.Spaces.forEach(space => {
            space.properties.forEach(property => {
                if(property[query].includes(value)){
                    const result = {}
                    result.name = space.name;
                    result.email = space.email;
                    result.phone = space.phone;
                    result.properties = [];
                    result.properties.push(property);
                    filtered.push(result);
                }
            })
        })
        data.Spaces = filtered;
    } else {
        data.Spaces = [];
    }
    res.render('coworker', data);
})

app.get('/logout', (req, res) => {
    if(req.session.user) {
        req.session.destroy();
        data.navItems = ['Login', 'Register'];
        data.navPaths = ['/login', '/register'];
    }
    res.redirect('/');
})


/**
 * Details
 * This route is only for debug or development. Remove this in production.
 * It displays all registered users, properties and workspaces in a single glance.
 */
app.get('/details', (req, res) => { // Helper - Shows all saved data
    res.json({
        Users: Users,
        Properties: Properties
    });
})


/**
 * Wildcard
 * Default route for any unmatched route parameter
 * This redirects the user to a 404: Page not found error page.
 */
app.get('*', (req, res) => {
    if(req.session.user) {
        data.navItems = [req.session.user.email, 'Logout'];
        data.navPaths = ['', '/logout'];
    }
    res.status(404).render('errors/404', data);
})


/**
 * Server
 * Commence listening on server
 */
app.listen(port, async () => {
    await initializeDB();
    console.log(`Server started listening at: http://localhost:${port}`);
})

async function initializeDB() {
    try {
        await sql.connect(sqlConnectionString);
        const result = await sql.query(`SELECT users, properties, property_id, workspace_id FROM data WHERE _id = 1`);
        Users = JSON.parse(result.recordset[0].users);
        Properties = JSON.parse(result.recordset[0].properties);
        propertyID = JSON.parse(result.recordset[0].property_id);
        workspaceID = JSON.parse(result.recordset[0].workspace_id);
    } catch (err) {
        console.error(err)
        Users = [];
        Properties = {};
        propertyID = 0;
        workspaceID = 0;
    }
}