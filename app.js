// Collection to keep the todos
Todos = new Meteor.Collection('todos');
var postsArray, cnv;
// JS code for the client (browser)
if (Meteor.isClient) {
    // Session var to keep current filter type ("all", "active", "completed")
    Session.set('filter', 'all');
    Template.todoapp.getCnv = function () {
        Meteor.defer(function () {
            cnv = document.getElementById('cnv').getContext('2d');
            cnv.lineWidth = 10;
            postsArray = Todos.find().fetch();
            cnv.clearRect(0, 0, 1000, 1000);
            cnv.beginPath();
            cnv.moveTo(0, 0);
            cnv.strokeStyle = "#8FA4E4";
            postsArray.forEach(function (key) {
                cnv.lineTo(key.x, key.y);
                cnv.moveTo(key.x, key.y);
                cnv.stroke();
            });
        });
    };
    // Session var to keep todo which is currently in editing mode, if any
    Session.set('editing_todo', null);

    // Set up filter types and their mongo db selectors
    var filter_selections = {
        all: {},
        active: {completed: false},
        completed: {completed: true}
    };

    // Get selector types as array
    var filters = _.keys(filter_selections);

    // Bind route handlers to filter types
    var routes = {};
    _.each(filters, function (filter) {
        routes['/' + filter] = function () {
            Session.set('filter', filter);
        };
    });

    // Initialize router with routes
    var router = Router(routes);
    router.init();

    /////////////////////////////////////////////////////////////////////////
    // The following two functions are taken from the official Meteor
    // "Todos" example
    // The original code can be viewed at: https://github.com/meteor/meteor
    /////////////////////////////////////////////////////////////////////////


    ////
    // Logic for the 'todoapp' partial which represents the whole app
    ////

    // Helper to get the number of todos
    Template.todoapp.helpers({
        todos: function () {
            Template.todoapp.getCnv();
            return Todos.find().count();
        }
    });


    // Register key events for adding new todo
    Template.todoapp.events({
        "keydown .new-point": function (event) {
            if (event.keyCode == 13) {
                var x = document.getElementsByName('x')[0];
                var y = document.getElementsByName('y')[0];
                Todos.insert({
                    x: x.value,
                    y: y.value,
                    completed: false,
                    createdAt: new Date()
                });
                x.value = '';
                y.value = '';
                return false;
            }
        }
    });

    ////
    // Logic for the 'main' partial which wraps the actual todo list
    ////

    // Get the todos considering the current filter type

    Template.main.helpers({
        todos: function () {
            return Todos.find(filter_selections[Session.get('filter')], {sort: {createdAt: 1}});
        }
    });

    Template.main.helpers({
        todos_not_completed: function () {
            return Todos.find({completed: false}).count();
        }
    });

    // Register click event for toggling complete/not complete button
    Template.main.events = {
        'click input#toggle-all': function (evt) {
            var completed = true;
            if (!Todos.find({completed: false}).count()) {
                completed = false;
            }
            Todos.find({}).forEach(function (todo) {
                Todos.update({'_id': todo._id}, {$set: {completed: completed}});
            });
        }
    };

    ////
    // Logic for the 'todo' partial representing a todo
    ////


    // Get the current todo which is in editing mode, if any
    Template.todo.helpers({
        todo_editing: function () {
            return Session.equals('editing_todo', this._id);
        }
    });
    // Register events for toggling todo's state, editing mode and destroying a todo
    Template.todo.events = {
        'click .toggle': function () {
            Todos.update(this._id, {$set: {completed: !this.completed}});
        },
        'dblclick label': function () {
            Session.set('editing_todo', this._id);
        },
        'click button.destroy': function () {
            Todos.remove(this._id);
        },
        "keydown input.edit": function (event) {
            if (event.keyCode == 13) {
                var x = document.getElementById('x');
                var y = document.getElementById('y');
                Todos.update(this._id, {
                    $set: {
                        x: x.value,
                        y: y.value,
                        completed: false
                    }
                });
                Template.todoapp.getCnv();
                Session.set('editing_todo', null);
            }
        }
    };

    // Register key events for updating title of an existing todo
    /*  Template.todo.events[okcancel_events('li.editing input.edit')] =
     make_okcancel_handler({
     ok: function (value) {
     Session.set('editing_todo', null);
     Todos.update(this._id, {$set: {title: $.trim(value)}});
     },
     cancel: function () {
     Session.set('editing_todo', null);
     Todos.remove(this._id);
     }
     });

     */


    ////
    // Logic for the 'footer' partial
    ////
    // Get the number of todos completed

    Template.footer.helpers({
        todos_completed: function () {
            return Todos.find({completed: true}).count();
        }
    });
    Template.footer.helpers({
        todos_not_completed: function () {
            return Todos.find({completed: false}).count();
        }
    });

    // True if exactly one todo is not completed, false otherwise
    // Used for handling pluralization of "item"/"items" word

    Template.footer.helpers({
        todos_one_not_completed: function () {
            return Todos.find({completed: false}).count() == 1;
        }
    });
    // Prepare array with keys of filter_selections only
    Template.footer.filters = filters;

    // True if the requested filter type is currently selected,
    // false otherwise
    Template.footer.filter_selected = function (type) {
        return Session.equals('filter', type);
    };

    // Register click events for clearing completed todos
    Template.footer.events = {
        'click button#clear-completed': function () {
            Meteor.call('clearCompleted');
        }
    };
}

//Publish and subscribe setting
if (Meteor.isServer) {
    Meteor.publish('todos', function () {
        return Todos.find();
    });
}

if (Meteor.isClient) {
    Meteor.subscribe('todos');
}

//Allow users to write directly to this collection from client code, subject to limitations you define.
if (Meteor.isServer) {
    Todos.allow({
        insert: function () {
            return true;
        },
        update: function () {
            return true;
        },
        remove: function () {
            return true;
        }
    });
}

//Defines functions that can be invoked over the network by clients.
Meteor.methods({
    clearCompleted: function () {
        Todos.remove({completed: true});
    }
});