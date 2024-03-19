// Packages.
const express = require("express");
const myApp = express();
const path = require("path");
const mongoose = require("mongoose");
const session = require("express-session");
const fileupload = require('express-fileupload');
const { check, validationResult } = require('express-validator');

// Database connection;
mongoose.connect("mongodb://localhost:27017/Raisetick");

// Models; 
const AdminUser = mongoose.model('AdminUser', {
    username: String,
    password: String,
});
const Ticket = mongoose.model('Ticket', {
    name: String,
    email: String,
    phone: String,
    message: String,
    imageName: String
});

// Creating session.
myApp.use(session({
    secret: "RAISETICK",
    resave: false,
    saveUninitialized: true
}))

// middlewares
myApp.use(express.static(__dirname + "/public"));
myApp.use(fileupload());
myApp.set("view engine", "ejs");
myApp.set("views", path.join(__dirname, "views"));
myApp.use(express.urlencoded({ extended: false }));

// Routes;
// Home page.
myApp.get("/", (req, res) => {
    if (req.session.loggedIn === true) {
        const pageData = {
            isLoggedIn: req.session.loggedIn,
            username: req.session.username
        }
        res.render("Dashboard", pageData);
    } else {
        const pageData = {
            isLoggedIn: false,
            username: ""
        }
        res.render("newticket", pageData);
    }

});

// Login page.
myApp.get("/login", (req, res) => {
    if (req.session.loggedIn === true) {
        const pageData = {
            isLoggedIn: req.session.loggedIn,
            username: req.session.username
        }
        res.render("login", pageData);
    } else {
        const pageData = {
            isLoggedIn: false,
            username: ""
        }
        res.render("login", pageData);
    }
});

// Logout.
myApp.get('/logout', (req, res) => {
    // Reset username, set loggedIn to false and redirect to login page.
    req.session.username = '';
    req.session.loggedIn = false;
    res.redirect('/login');
});


// Dashboard page.
myApp.get("/dashboard", (req, res) => {
    // if user is logged in then it will redirect to dashboard page else login page. 
    if (req.session.loggedIn) {
        Ticket.find({}).exec((err, tickets) => {
            var pageData = {
                tickets,
                isLoggedIn: req.session.loggedIn,
                username: req.session.username
            }
            res.render('dashboard', pageData);
        });
    } else {
        const pageData = {
            isLoggedIn: req.session.loggedIn,
            username: req.session.username
        }
        res.render("login", pageData)
    }
}
);

// Create ticket.
myApp.get("/newticket", (req, res) => {
    res.render("newticket");
});

// View ticket.
myApp.get('/view/:id', (req, res) => {
    if (req.session.loggedIn) {
        var id = req.params.id;
        Ticket.findOne({ _id: id }).exec((err, ticket) => {
            var pageData = {
                name: ticket.name,
                email: ticket.email,
                phone: ticket.phone,
                message: ticket.message,
                imageName: ticket.imageName,
                isLoggedIn: true,
                username: req.session.username
            }
            res.render('ticket', pageData);
        })
    } else {
        res.redirect("login")
    }
}
);


// Edit ticket.
myApp.get('/edit/:id', (req, res) => {
    if (req.session.loggedIn) {
        var id = req.params.id;
        Ticket.findOne({ _id: id }).exec((err, ticket) => {
            var pageData = {
                name: ticket.name,
                email: ticket.email,
                phone: ticket.phone,
                message: ticket.message,
                imageName: ticket.imageName,
                id,
                isLoggedIn: true,
                username: req.session.username
            }
            res.render('edit', pageData);
        })
    } else {
        res.redirect("login");
    }
}

);

// Delete ticket.
myApp.get('/delete/:id', (req, res) => {
    if (req.session.loggedIn) {
        var id = req.params.id;
        Ticket.findByIdAndDelete({ _id: id }).exec((err, ticket) => {

            var message = 'Sorry, ticket not found';
            if (ticket) {
                message = 'Ticket deleted successfully';
            }

            var msg = {
                data: message,
                isLoggedIn: req.session.loggedIn,
                username: req.session.username
            }
            res.render('Include/thankyou', msg);
        })
    } else {
        res.redirect("login");
    }
}
);

// New ticket process.
myApp.post('/process', [
    check('name', 'Please enter a name.').notEmpty(),
    check('email', 'Please enter a valid email').isEmail(),
    check('phone', 'Please enter phone number').notEmpty(),
    check('message', 'Please enter message').notEmpty()
], (req, res) => {

    // check for errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.render('newticket', { error: errors.array() });
    }
    else {
        //fetch all the form fields
        var name = req.body.name;
        var email = req.body.email;
        var phone = req.body.phone;
        var message = req.body.message;
        var ticketImage = req.files.ticketImage;
        var imageName = req.files.ticketImage.name;
        var imagePath = `public/uploads/${imageName}`;
        ticketImage.mv(imagePath);

        // create an object with the fetched data to send to the view
        var pageData = {
            name,
            email,
            phone,
            message,
            imageName,
        };
        var ticket = new Ticket(pageData);
        ticket.save();

        const msg = {
            data: "Your Ticket has been successfully submitted.",
            isLoggedIn: false,
            username: req.session.username
        }
        res.render('Include/thankyou', msg);
    }
});

// Edit ticket process.
myApp.post('/editprocess', (req, res) => {
    //fetch all the form fields
    var id = req.body.id
    var name = req.body.name;
    var email = req.body.email;
    var phone = req.body.phone;
    var message = req.body.message;
    var ticketImage = req.files.ticketImage;
    var imageName = req.files.ticketImage.name;
    var imagePath = `public/uploads/${imageName}`;
    ticketImage.mv(imagePath);

    Ticket.findOne({ _id: id }).exec((err, ticket) => {
        ticket.name = name;
        ticket.email = email;
        ticket.phone = phone;
        ticket.message = message;
        ticket.imageName = imageName;
        ticket.save();
    });
    const msg = {
        data: "Your Ticket has been successfully edited.",
        isLoggedIn: req.session.loggedIn,
        username: req.session.username
    }
    res.render('Include/thankyou', msg);
}
);

// Login process.
myApp.post('/loginprocess', (req, res) => {
    // fetch all the form fields.
    var username = req.body.username;
    var password = req.body.password;

    // find in database 
    AdminUser.findOne({ username: username, password: password }).exec((err, adminuser) => {

        if (adminuser) {
            req.session.username = adminuser.username;
            req.session.loggedIn = true;
            res.redirect('/dashboard');
        }
        else {
            var pageData = {
                error: 'Login details not correct',
                isLoggedIn: req.session.loggedIn,
                username: req.session.username
            }
            res.render('login', pageData);
        }
    });
});

// create Admin user.
myApp.get('/setup', function (req, res) {
    var adminData = {
        username: 'Manav',
        password: 'manav@123',

    }
    var newAdmin = new AdminUser(adminData);
    newAdmin.save();
    res.send('DONE');
});

//listening at a port
myApp.listen(8080);
console.log('http://localhost:8080 in your browser');