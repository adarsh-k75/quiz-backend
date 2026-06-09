-- Create questions table
CREATE TABLE IF NOT EXISTS questions (
    id SERIAL PRIMARY KEY,
    text TEXT NOT NULL,
    opt_a VARCHAR(255) NOT NULL,
    opt_b VARCHAR(255) NOT NULL,
    opt_c VARCHAR(255) NOT NULL,
    opt_d VARCHAR(255) NOT NULL,
    correct CHAR(1) NOT NULL
);

-- Create submissions table
CREATE TABLE IF NOT EXISTS submissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    batch VARCHAR(255) NOT NULL,
    score INT NOT NULL,
    speed_bonus FLOAT NOT NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Insert 10 sample web development questions
INSERT INTO questions (text, opt_a, opt_b, opt_c, opt_d, correct) VALUES
('Which of the following HTTP status codes represents ''Unauthorized'' access?', '400 Bad Request', '401 Unauthorized', '403 Forbidden', '404 Not Found', 'B'),
('What is the primary purpose of the ''defer'' attribute in a <script> tag?', 'It executes the script asynchronously as soon as it is downloaded', 'It delays script execution until the HTML document is fully parsed', 'It blocks page rendering until the script is fully executed', 'It executes the script in a web worker thread', 'B'),
('In CSS Flexbox, which property controls the alignment of items along the main axis?', 'align-items', 'align-content', 'justify-content', 'flex-direction', 'C'),
('Which React Hook is designed to execute side effects in a functional component?', 'useState', 'useMemo', 'useEffect', 'useCallback', 'C'),
('What is the primary role of the Event Loop in the JavaScript runtime?', 'It executes database operations asynchronously on separate OS threads', 'It manages memory allocation and garbage collection for the application', 'It monitors the call stack and execution queue to run asynchronous callbacks', 'It runs synchronous JavaScript code in a pool of worker threads', 'C'),
('Which HTML5 element is used to display a self-contained thematic content like illustrations, diagrams, or photos?', 'picture', 'figure', 'image', 'aside', 'B'),
('What is the correct syntax in CSS to target all elements with the class name ''highlight''?', '#highlight', '.highlight', 'highlight', '*highlight', 'B'),
('Which SQL keyword is used to sort the result-set in ascending or descending order?', 'SORT BY', 'ORDER BY', 'GROUP BY', 'ALIGN BY', 'B'),
('In JavaScript, what is the value of typeof null?', 'object', 'null', 'undefined', 'boolean', 'A'),
('Which of the following is NOT a valid state in a Promise in JavaScript?', 'pending', 'fulfilled', 'rejected', 'processing', 'D');
