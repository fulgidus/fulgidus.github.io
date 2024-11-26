import { vi, afterEach, beforeEach } from 'vitest';


beforeEach(() => {
    // Set up any necessary mocks or spies before each test
    // Example: vi.mock('some-module');  // Mock a module
});

afterEach(() => {
    // Clean up any mocks or spies after each test.  This is crucial for preventing test interference.
    vi.clearAllMocks();
    vi.restoreAllMocks();
});


//Optional: Global setup for all tests. Use with caution!
//This could be useful for setting up a test database connection or a global mock,
//but generally avoid global setups unless absolutely necessary to keep tests isolated and maintainable.
// beforeAll(() => {
//   // ... setup code to run before all tests
// });

// afterAll(() => {
//   // ... teardown code to run after all tests
// });

//Example of mocking a specific function or method.  This is preferable to mocking whole modules when possible.
// vi.mock('./my-module', () => ({
//   myFunction: vi.fn(() => 'mocked result'),
// }));


//Example assertion to check the value returned by a mocked function.
// expect(myFunction()).toBe('mocked result')


//Example of setting a global variable for testing purposes. Again, use sparingly!
// globalThis.someGlobalVar = 'test value';


