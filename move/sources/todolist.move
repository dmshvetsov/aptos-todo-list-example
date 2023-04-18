module todolist_addr::todolist {
    use aptos_framework::event;
    use aptos_framework::account;
    use std::signer;
    use std::string::String;
    use aptos_std::table::{Self, Table};

    // Errors
    const E_NOT_INITIALIZED: u64 = 1;
    const ETASK_DOESNT_EXIST: u64 = 2;
    const ETASK_IS_COMPLETED: u64 = 3;

    struct Task has store, drop, copy {
        task_id: u64,
        address: address,
        content: String,
        completed: bool,
    }

    struct TodoList has key {
        tasks: Table<u64, Task>,
        set_task_event: event::EventHandle<Task>,
        counter: u64,
    }

    public entry fun create_list(account: &signer) {
        let todo_list = TodoList {
            tasks: table::new(),
            set_task_event: account::new_event_handle<Task>(account),
            counter: 0
        };
        move_to(account, todo_list);
    }

    public entry fun create_task(account: &signer, content: String) acquires TodoList {
        let signer_addr = signer::address_of(account);
        // assert signer has created a list
        assert!(exists<TodoList>(signer_addr), E_NOT_INITIALIZED);

        let todo_list = borrow_global_mut<TodoList>(signer_addr);
        let counter = todo_list.counter + 1;
        let new_task = Task {
            address: signer_addr,
            task_id: counter,
            content,
            completed: false,
        };
        table::upsert(&mut todo_list.tasks, counter, new_task);
        todo_list.counter = counter;

        event::emit_event<Task>(
            &mut borrow_global_mut<TodoList>(signer_addr).set_task_event,
            new_task,
        );
    }

    public entry fun complete_task(account: &signer, task_id: u64) acquires TodoList {
        let signer_addr = signer::address_of(account);
        // assert signer has created a list
        assert!(exists<TodoList>(signer_addr), E_NOT_INITIALIZED);

        let todo_list = borrow_global_mut<TodoList>(signer_addr);
        // assert task exists
        assert!(table::contains(&todo_list.tasks, task_id), ETASK_DOESNT_EXIST);

        let task = table::borrow_mut(&mut todo_list.tasks, task_id);
        // assert task is not completed
        assert!(task.completed == false, ETASK_IS_COMPLETED);
        task.completed = true;
    }

    // Tests

    #[test_only]
    use std::string;

    #[test(admin = @0x123)]
    public entry fun test_flow(admin: signer) acquires TodoList {
        // creates an admin @todolist_addr account for test
        account::create_account_for_test(signer::address_of(&admin));
        // initialize contract with admin account
        create_list(&admin);

        // creates a task by the admin account
        create_task(&admin, string::utf8(b"New Task"));
        let task_count = event::counter(&borrow_global<TodoList>(signer::address_of(&admin)).set_task_event);
        assert!(task_count == 1, 4);
        let todo_list = borrow_global<TodoList>(signer::address_of(&admin));
        assert!(todo_list.counter == 1, 5);
        let task_record = table::borrow(&todo_list.tasks, todo_list.counter);
        assert!(task_record.task_id == 1, 6);
        assert!(task_record.completed == false, 7);
        assert!(task_record.content == string::utf8(b"New Task"), 8);
        assert!(task_record.address == signer::address_of(&admin), 9);

        // updates task as completed
        complete_task(&admin, 1);
        let todo_list = borrow_global<TodoList>(signer::address_of(&admin));
        let task_record = table::borrow(&todo_list.tasks, 1);
        assert!(task_record.task_id == 1, 10);
        assert!(task_record.completed == true, 11);
        assert!(task_record.content == string::utf8(b"New Task"), 12);
        assert!(task_record.address == signer::address_of(&admin), 13);
    }
}
