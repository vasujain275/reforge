-- +goose Up
-- +goose StatementBegin

-- Seed common DSA patterns
-- Using INSERT with WHERE NOT EXISTS to skip duplicates based on title uniqueness

INSERT INTO patterns (title, description)
SELECT 'Two Pointers', 'Use two pointers moving towards each other or in the same direction to solve problems efficiently'
WHERE NOT EXISTS (SELECT 1 FROM patterns WHERE title = 'Two Pointers');

INSERT INTO patterns (title, description)
SELECT 'Sliding Window', 'Maintain a window of elements and slide it across the array to find optimal solutions'
WHERE NOT EXISTS (SELECT 1 FROM patterns WHERE title = 'Sliding Window');

INSERT INTO patterns (title, description)
SELECT 'Binary Search', 'Efficiently search sorted arrays by repeatedly dividing the search space in half'
WHERE NOT EXISTS (SELECT 1 FROM patterns WHERE title = 'Binary Search');

INSERT INTO patterns (title, description)
SELECT 'Depth-First Search (DFS)', 'Explore as far as possible along each branch before backtracking'
WHERE NOT EXISTS (SELECT 1 FROM patterns WHERE title = 'Depth-First Search (DFS)');

INSERT INTO patterns (title, description)
SELECT 'Breadth-First Search (BFS)', 'Explore all neighbors at the present depth before moving to nodes at the next depth level'
WHERE NOT EXISTS (SELECT 1 FROM patterns WHERE title = 'Breadth-First Search (BFS)');

INSERT INTO patterns (title, description)
SELECT 'Dynamic Programming', 'Break down complex problems into simpler subproblems and store their solutions'
WHERE NOT EXISTS (SELECT 1 FROM patterns WHERE title = 'Dynamic Programming');

INSERT INTO patterns (title, description)
SELECT 'Backtracking', 'Build solutions incrementally and abandon paths that fail to satisfy constraints'
WHERE NOT EXISTS (SELECT 1 FROM patterns WHERE title = 'Backtracking');

INSERT INTO patterns (title, description)
SELECT 'Greedy', 'Make locally optimal choices at each step with the hope of finding a global optimum'
WHERE NOT EXISTS (SELECT 1 FROM patterns WHERE title = 'Greedy');

INSERT INTO patterns (title, description)
SELECT 'Divide and Conquer', 'Divide problem into smaller subproblems, solve them recursively, and combine solutions'
WHERE NOT EXISTS (SELECT 1 FROM patterns WHERE title = 'Divide and Conquer');

INSERT INTO patterns (title, description)
SELECT 'Recursion', 'Solve problems by having a function call itself with modified parameters'
WHERE NOT EXISTS (SELECT 1 FROM patterns WHERE title = 'Recursion');

INSERT INTO patterns (title, description)
SELECT 'Stack', 'Use LIFO (Last In First Out) data structure for tracking elements'
WHERE NOT EXISTS (SELECT 1 FROM patterns WHERE title = 'Stack');

INSERT INTO patterns (title, description)
SELECT 'Queue', 'Use FIFO (First In First Out) data structure for processing elements in order'
WHERE NOT EXISTS (SELECT 1 FROM patterns WHERE title = 'Queue');

INSERT INTO patterns (title, description)
SELECT 'Heap/Priority Queue', 'Maintain a collection where the min/max element can be efficiently accessed'
WHERE NOT EXISTS (SELECT 1 FROM patterns WHERE title = 'Heap/Priority Queue');

INSERT INTO patterns (title, description)
SELECT 'Hash Table/Hash Map', 'Use key-value mapping for O(1) average lookup, insertion, and deletion'
WHERE NOT EXISTS (SELECT 1 FROM patterns WHERE title = 'Hash Table/Hash Map');

INSERT INTO patterns (title, description)
SELECT 'Linked List Manipulation', 'Modify linked list structure through pointer manipulation'
WHERE NOT EXISTS (SELECT 1 FROM patterns WHERE title = 'Linked List Manipulation');

INSERT INTO patterns (title, description)
SELECT 'Tree Traversal', 'Visit all nodes in a tree structure (inorder, preorder, postorder, level-order)'
WHERE NOT EXISTS (SELECT 1 FROM patterns WHERE title = 'Tree Traversal');

INSERT INTO patterns (title, description)
SELECT 'Graph Traversal', 'Visit all vertices in a graph structure using DFS or BFS'
WHERE NOT EXISTS (SELECT 1 FROM patterns WHERE title = 'Graph Traversal');

INSERT INTO patterns (title, description)
SELECT 'Topological Sort', 'Linear ordering of vertices in a directed acyclic graph'
WHERE NOT EXISTS (SELECT 1 FROM patterns WHERE title = 'Topological Sort');

INSERT INTO patterns (title, description)
SELECT 'Union Find (Disjoint Set)', 'Track and merge disjoint sets efficiently for connectivity problems'
WHERE NOT EXISTS (SELECT 1 FROM patterns WHERE title = 'Union Find (Disjoint Set)');

INSERT INTO patterns (title, description)
SELECT 'Trie', 'Tree-based data structure for efficient string prefix operations'
WHERE NOT EXISTS (SELECT 1 FROM patterns WHERE title = 'Trie');

INSERT INTO patterns (title, description)
SELECT 'Bit Manipulation', 'Use bitwise operations to solve problems efficiently at the bit level'
WHERE NOT EXISTS (SELECT 1 FROM patterns WHERE title = 'Bit Manipulation');

INSERT INTO patterns (title, description)
SELECT 'Monotonic Stack', 'Maintain a stack where elements are in monotonic order'
WHERE NOT EXISTS (SELECT 1 FROM patterns WHERE title = 'Monotonic Stack');

INSERT INTO patterns (title, description)
SELECT 'Monotonic Queue', 'Maintain a queue where elements are in monotonic order'
WHERE NOT EXISTS (SELECT 1 FROM patterns WHERE title = 'Monotonic Queue');

INSERT INTO patterns (title, description)
SELECT 'Prefix Sum', 'Precompute cumulative sums to answer range sum queries efficiently'
WHERE NOT EXISTS (SELECT 1 FROM patterns WHERE title = 'Prefix Sum');

INSERT INTO patterns (title, description)
SELECT 'Difference Array', 'Use difference array technique for efficient range update operations'
WHERE NOT EXISTS (SELECT 1 FROM patterns WHERE title = 'Difference Array');

INSERT INTO patterns (title, description)
SELECT 'Fast and Slow Pointers', 'Use two pointers moving at different speeds to detect cycles or find middle elements'
WHERE NOT EXISTS (SELECT 1 FROM patterns WHERE title = 'Fast and Slow Pointers');

INSERT INTO patterns (title, description)
SELECT 'Binary Tree Construction', 'Build binary trees from traversal sequences or other representations'
WHERE NOT EXISTS (SELECT 1 FROM patterns WHERE title = 'Binary Tree Construction');

INSERT INTO patterns (title, description)
SELECT 'Binary Search Tree Operations', 'Perform operations on BST leveraging its sorted property'
WHERE NOT EXISTS (SELECT 1 FROM patterns WHERE title = 'Binary Search Tree Operations');

INSERT INTO patterns (title, description)
SELECT 'Segment Tree', 'Tree data structure for storing intervals and efficient range queries'
WHERE NOT EXISTS (SELECT 1 FROM patterns WHERE title = 'Segment Tree');

INSERT INTO patterns (title, description)
SELECT 'Fenwick Tree (Binary Indexed Tree)', 'Tree structure for efficient prefix sum computation and updates'
WHERE NOT EXISTS (SELECT 1 FROM patterns WHERE title = 'Fenwick Tree (Binary Indexed Tree)');

INSERT INTO patterns (title, description)
SELECT 'Intervals/Merge Intervals', 'Work with intervals for scheduling, merging, or intersection problems'
WHERE NOT EXISTS (SELECT 1 FROM patterns WHERE title = 'Intervals/Merge Intervals');

INSERT INTO patterns (title, description)
SELECT 'Matrix Traversal', 'Navigate through 2D arrays using various traversal patterns'
WHERE NOT EXISTS (SELECT 1 FROM patterns WHERE title = 'Matrix Traversal');

INSERT INTO patterns (title, description)
SELECT 'Simulation', 'Directly simulate the process described in the problem'
WHERE NOT EXISTS (SELECT 1 FROM patterns WHERE title = 'Simulation');

INSERT INTO patterns (title, description)
SELECT 'Sorting Algorithms', 'Apply various sorting techniques to organize data'
WHERE NOT EXISTS (SELECT 1 FROM patterns WHERE title = 'Sorting Algorithms');

INSERT INTO patterns (title, description)
SELECT 'Counting/Frequency Map', 'Count occurrences of elements using hash maps or arrays'
WHERE NOT EXISTS (SELECT 1 FROM patterns WHERE title = 'Counting/Frequency Map');

INSERT INTO patterns (title, description)
SELECT 'Cyclic Sort', 'Sort arrays containing numbers in a given range by placing each number at its correct index'
WHERE NOT EXISTS (SELECT 1 FROM patterns WHERE title = 'Cyclic Sort');

INSERT INTO patterns (title, description)
SELECT 'Modified Binary Search', 'Apply binary search with modifications for rotated arrays or other variations'
WHERE NOT EXISTS (SELECT 1 FROM patterns WHERE title = 'Modified Binary Search');

INSERT INTO patterns (title, description)
SELECT 'Kadane''s Algorithm', 'Find maximum sum contiguous subarray in linear time'
WHERE NOT EXISTS (SELECT 1 FROM patterns WHERE title = 'Kadane''s Algorithm');

INSERT INTO patterns (title, description)
SELECT 'Two Heaps Pattern', 'Use two heaps (min and max) to solve problems like finding median'
WHERE NOT EXISTS (SELECT 1 FROM patterns WHERE title = 'Two Heaps Pattern');

INSERT INTO patterns (title, description)
SELECT 'Subsets/Combinations/Permutations', 'Generate all possible subsets, combinations, or permutations'
WHERE NOT EXISTS (SELECT 1 FROM patterns WHERE title = 'Subsets/Combinations/Permutations');

INSERT INTO patterns (title, description)
SELECT 'Palindrome Patterns', 'Identify or construct palindromic sequences'
WHERE NOT EXISTS (SELECT 1 FROM patterns WHERE title = 'Palindrome Patterns');

INSERT INTO patterns (title, description)
SELECT 'String Manipulation', 'Transform or analyze strings using various techniques'
WHERE NOT EXISTS (SELECT 1 FROM patterns WHERE title = 'String Manipulation');

INSERT INTO patterns (title, description)
SELECT 'Math and Geometry', 'Apply mathematical formulas and geometric principles'
WHERE NOT EXISTS (SELECT 1 FROM patterns WHERE title = 'Math and Geometry');

INSERT INTO patterns (title, description)
SELECT 'Line Sweep', 'Process events in sorted order to solve interval or geometric problems'
WHERE NOT EXISTS (SELECT 1 FROM patterns WHERE title = 'Line Sweep');

INSERT INTO patterns (title, description)
SELECT 'Rolling Hash', 'Use hash function with sliding window for efficient string matching'
WHERE NOT EXISTS (SELECT 1 FROM patterns WHERE title = 'Rolling Hash');

INSERT INTO patterns (title, description)
SELECT 'Reservoir Sampling', 'Randomly sample items from a stream of unknown size'
WHERE NOT EXISTS (SELECT 1 FROM patterns WHERE title = 'Reservoir Sampling');

INSERT INTO patterns (title, description)
SELECT 'Rejection Sampling', 'Generate samples from a distribution by accepting or rejecting candidates'
WHERE NOT EXISTS (SELECT 1 FROM patterns WHERE title = 'Rejection Sampling');

INSERT INTO patterns (title, description)
SELECT 'Game Theory', 'Apply game theory concepts like Nim, minimax for optimal strategy'
WHERE NOT EXISTS (SELECT 1 FROM patterns WHERE title = 'Game Theory');

INSERT INTO patterns (title, description)
SELECT 'Minimax', 'Find optimal move in two-player games by minimizing maximum possible loss'
WHERE NOT EXISTS (SELECT 1 FROM patterns WHERE title = 'Minimax');

INSERT INTO patterns (title, description)
SELECT 'Memoization', 'Cache function results to avoid redundant computations (top-down DP)'
WHERE NOT EXISTS (SELECT 1 FROM patterns WHERE title = 'Memoization');

INSERT INTO patterns (title, description)
SELECT 'Tabulation', 'Build solutions bottom-up by filling a table (bottom-up DP)'
WHERE NOT EXISTS (SELECT 1 FROM patterns WHERE title = 'Tabulation');

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

-- Remove seeded patterns
-- Using DELETE WHERE title IN to remove only the patterns we added
DELETE FROM patterns WHERE title IN (
    'Two Pointers',
    'Sliding Window',
    'Binary Search',
    'Depth-First Search (DFS)',
    'Breadth-First Search (BFS)',
    'Dynamic Programming',
    'Backtracking',
    'Greedy',
    'Divide and Conquer',
    'Recursion',
    'Stack',
    'Queue',
    'Heap/Priority Queue',
    'Hash Table/Hash Map',
    'Linked List Manipulation',
    'Tree Traversal',
    'Graph Traversal',
    'Topological Sort',
    'Union Find (Disjoint Set)',
    'Trie',
    'Bit Manipulation',
    'Monotonic Stack',
    'Monotonic Queue',
    'Prefix Sum',
    'Difference Array',
    'Fast and Slow Pointers',
    'Binary Tree Construction',
    'Binary Search Tree Operations',
    'Segment Tree',
    'Fenwick Tree (Binary Indexed Tree)',
    'Intervals/Merge Intervals',
    'Matrix Traversal',
    'Simulation',
    'Sorting Algorithms',
    'Counting/Frequency Map',
    'Cyclic Sort',
    'Modified Binary Search',
    'Kadane''s Algorithm',
    'Two Heaps Pattern',
    'Subsets/Combinations/Permutations',
    'Palindrome Patterns',
    'String Manipulation',
    'Math and Geometry',
    'Line Sweep',
    'Rolling Hash',
    'Reservoir Sampling',
    'Rejection Sampling',
    'Game Theory',
    'Minimax',
    'Memoization',
    'Tabulation'
);

-- +goose StatementEnd
