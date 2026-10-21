export default {
    open() {
        // Version bumped to 5 to add two new object stores for phased
        // projects: project_phases and project_log_entries. onupgradeneeded
        // runs for every version transition, so the existing stores are
        // created only when they are still missing (fresh installs) and the
        // new ones are added for upgrades too.
        var req = indexedDB.open('weekToDo', 5);
        req.onupgradeneeded = function (event) {
            var db = event.target.result;
            if (!db.objectStoreNames.contains("todo_lists")) {
                db.createObjectStore('todo_lists', {autoIncrement: false});
            }

            if (!db.objectStoreNames.contains("repeating_events")) {
                db.createObjectStore('repeating_events', {autoIncrement: false});
            }

            if (!db.objectStoreNames.contains("repeating_events_by_date")) {
                db.createObjectStore('repeating_events_by_date', {autoIncrement: false});
            }

            if (!db.objectStoreNames.contains("project_phases")) {
                db.createObjectStore('project_phases', {autoIncrement: false});
            }

            if (!db.objectStoreNames.contains("project_log_entries")) {
                db.createObjectStore('project_log_entries', {autoIncrement: false});
            }
        }
        req.onerror = function (event) {
            console.log('error opening database ' + event.target.errorCode);
        }
        return req;
    },
    get(db, table, id) {
        let tx = db.transaction([table], 'readonly');
        let store = tx.objectStore(table);
        let req = store.get(id);
        return req;
    },
    add(db, table, id, obj) {
        let tx = db.transaction([table], 'readwrite');
        let store = tx.objectStore(table);
        let req = store.add(obj, id);
        return req;
    },
    update(db, table, id, obj) {
        let tx = db.transaction([table], 'readwrite');
        let store = tx.objectStore(table);
        let new_obj = JSON.parse(JSON.stringify(obj));
        let req = store.put(new_obj,id);
        return req;
    },
    delete(db, table, id) {
        let tx = db.transaction([table], 'readwrite');
        let store = tx.objectStore(table);
        let req = store.delete(id);
        return req;
    },
    selectAll(db, table){
        let tx = db.transaction([table], 'readwrite');
        let store = tx.objectStore(table);
        let req = store.openCursor();
        return req;
    },
    clear(db, table){
        let tx = db.transaction([table], 'readwrite');
        let store = tx.objectStore(table);
        let req = store.clear();
        return req;
    }
};
