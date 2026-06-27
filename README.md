### Welcome to my (First) Masterpiece:
Hello!

My name is Aaron and this is my first REAL portfolio project. I wanna spend some time splurging on what this project does and the elegANCE 
of the Prefix Sum algorithm. I'm not sure who will ever read this or check it out. But if you are a reader not named Aaron Sarkar, welcome to
PrefixSumMaster :)

<img width="3024" height="1700" alt="image" src="https://github.com/user-attachments/assets/fe24c33a-69f3-4dd6-ab7c-d53a2589723a" />


---

### Background (and reason for why I did this):

The prefix sum algo always kinda bugged me. The most annoying aspect of it was the unintuitiveness of it. Because it was a weakness is my 
logical thinking that I wanted to address, I decided to dedicate weeks to understanding it as deeply as I could. What it is, how it works,
what is the intuition beging it etc.

### What even is a Prefix Sum?
Lets first begin with what is a prefix sum and examples of where it works:
Let's start simple. Say you have this array:
A = [2, 4, 1, 7, 3]

A **prefix sum array** P is built so that each entry P[i] holds the cumulative sum of 
everything in A up to index i:
A = [ 2,  4,  1,  7,  3 ]

P = [ 2,  6,  7, 14, 17 ]

P[0] = 2  
P[1] = 2 + 4 = 6  
P[2] = 2 + 4 + 1 = 7  
...and so on.

You spend O(n) time building P once. That's your upfront expense. But here's where it gets interesting.
Say someone asks: *"What's the sum of elements from index 1 to 3?"*. 
Obviously we have the naive approach right...loop from index 1 to 3 and add. 
Fine. But now I tell you that you're answering **thousands** of queries on the same array, that's O(n) per query...O(n²) total. 
That's SO expensive. And you would **think** that it is what it is, we can't REALLY make it better right?
Well...enter our prefix array from earlier!

With a prefix sum, you answer **any** range query in O(1) with this beautiful math proof:
sum(l, r) = P[r] - P[l - 1]

So as an example, for l=1, r=3:
sum(1, 3) = P[3] - P[0] = 14 - 2 = 12

Check: 4 + 1 + 7 = 12. ✓

The intuition here is that P[r] is the sum of everything from index 0 to r. P[l-1] is the sum of everything before where we want to start. 
Segment the "left cut" and you're left with exactly the window you asked for. Incredible.


### Going Further: Querying for a Target

Prefix sums don't just answer "what's the sum here?" — they can answer "does a subarray summing to k even exist?"

Using a hash map alongside your prefix array, for each index r you ask: Does P[r] - k exist somewhere in our map?

If yes, then there's a subarray ending at r that sums to exactly k. You find it in O(n) total...one pass, no nested loops.

That jump from the naive O(n²) brute force to an O(n) solution is what made me fall in love with this pattern. It's the kind of thing 
that feels like a magic trick the first time you see it, and feels completely obvious the 10th time. But of course, to get to that 10th time 
required me to step it up a little...

---

### Extending to 2D

Ok so we understand 1D. Now let's go 2D. And I want to really show how I derived the one of the most elegant proofs I have ever seen.
I have drawings of how I first brute forced this by hand...but also what actually allowed me to derive what I show below!
<img width="2360" height="1322" alt="IMG_C1AB4B24FF9E-1" src="https://github.com/user-attachments/assets/9310493b-a8c0-4faa-aa18-e2af32120cfe" />
<img width="1971" height="1387" alt="IMG_2C1A48EF5B0D-1" src="https://github.com/user-attachments/assets/7978b3cb-6d86-4622-b6bb-caa825295399" />

Here's the matrix I worked with:

```
       c0   c1   c2
r0: [  1    0    1  ]
r1: [  0    0    0  ]
r2: [  1    1    1  ]

target k = 1
```
### Step 1: What even is a submatrix?

A submatrix is any rectangle you can draw inside the matrix...the smallest being a single cell, the largest being the whole thing. 
So when the problem says "how many submatrices sum to k", it's asking: **for every possible rectangle, does its sum equal k?**

The brute force instinct here is natural. You start with just r0. Then you try r0+r1. Then r0+r1+r2. Then r1 alone. Then r1+r2. Then r2 alone. 
And for each of those row bands, you go column by column expanding the window. I really did decide to brute force it paper though.
Not because I doubted math. It's because I've learned that if I can't verify something concretely, I don't actually understand it. Which, to me,
is pointless.


### Step 2: Building the 2D Prefix Matrix

In 1D, the prefix array was straightforward. In 2D it's more nuanced, because each cell has contributions coming
from above *and* to the left.

The formula I derived for building the 2D prefix matrix is:

```
P[r][c] = matrix[r][c] + P[r-1][c] + P[r][c-1] - P[r-1][c-1]
```

Why subtract `P[r-1][c-1]`? Because when you add the prefix above and the prefix to the left, you've double-counted the top-left region. 
It gets included once from above and once from the left. So you subtract it exactly once to correct for that.
Applying this to our matrix (with a sentinel row and column of 0s padded on the top and left):

```
prefMtx:
       c0   c1   c2   c3
r0: [  0    0    0    0  ]
r1: [  0    1    1    2  ]
r2: [  0    1    1    2  ]
r3: [  0    2    3    5  ]
```

### Step 3: The Query — Collapsing 2D Into 1D

Here's where it gets interesting. The goal is to reduce the 2D problem back into the 1D problem we already know how to solve.

The key insight is this: if you **fix a top row and a bottom row**, then the sum of any submatrix within that band (for a given column `c`) is:

```
colSum(c) = P[r_bottom][c] - P[r_top - 1][c]
```
Beautiful isnt it?

All it is, is just the 1D prefix trick applied vertically...you're extracting the column sum within your fixed row band. 
And once you have that, for each column you have a 1D array of column sums. 
And now the question is: does any contiguous window of those column sums equal k?

Which is exactly the 1D problem. So you run the exact same hashmap logic:

```
colSum(c) - k  ?=  some previously seen colSum
```

And you store each `colSum` as you go, with its frequency.


### Step 4: Why the Hashmap Resets Between Row Pairs

This one messed with a ton at first. In 1D, you keep one hashmap for the whole array.
In 2D, you reset it every time you move to a new row pair (new `r_top`, `r_bottom` combination).

Here's why: the hashmap stores column sums from a specific row pair. The moment you change which rows you're considering, those stored values 
are from a completely different search space. If you kept them around, you'd be mixing column sums from
different row pairs, reconstructing a "submatrix" that is almost "L-shaped". Not a submatrix and not valid.

The row pair defines the search space. So every new row pair we interact with, leads to a fresh map.


### Step 5: Why the 2D Query Has a Shifting "Top"

In 1D, the top of the prefix array is always 0. That's why we initialize the hashmap with `{0: 1}` and it just works since 
the "left boundary" never changes. 
In 2D, the top shifts. 
When you're looking at r1+r2, your `r_top - 1` is r0.
When you're looking at just r2, your `r_top - 1` is r1. The "zero" isn't at the top of the matrix anymore. Rather, it's wherever your current band starts.

So the full query in 2D is really:

```
(P[r_bottom][c] - P[r_top - 1][c]) - k  ?=  some previously seen colSum
```

Which mirrors the 1D derivation exactly:

```
1D:   p_right - k  ?=  p_left
2D:   colSum(c) - k  ?=  colSum seen before in this band
```

---

### Going 3D 
To quote the late, great Kobe Bryant, he once said, "May you always remember to enjoy the road, especially when it's a hard one." 
So I figured hey. Lets make this hard road even harder and enjoy it to its fullest.

In 1D, a prefix array accumulates along one axis.  
In 2D, a prefix matrix accumulates across two axes, and we corrected for
double counting with one subtraction.  
In 3D, a prefix cube accumulates across three axes, and the double/triple counting
problem gets significantly messier.

The structure is a cube of values, and `P[d][r][c]` should represent the sum of
everything in the sub-cube from the origin `(0,0,0)` to the point `(d,r,c)`.


### The Build Formula

To compute `P[d][r][c]` correctly, you can't just add three neighboring prefix
values and subtract one overlap like in 2D. You have 8 corners to reason about.

Here's how I derived it. Start with what you want to add:

```
+ cube[d][r][c]          ← the raw cell value
+ P[d][r][c-1]           ← prefix to the left  (along columns)
+ P[d][r-1][c]           ← prefix above         (along rows)
+ P[d-1][r][c]           ← prefix behind        (along depth)
```

But now you've triple counted the intersections of those planes. So subtract the
three pairwise overlaps:

```
- P[d][r-1][c-1]         ← left+above overlap counted twice → subtract once
- P[d-1][r-1][c]         ← above+behind overlap counted twice → subtract once
- P[d-1][r][c-1]         ← left+behind overlap counted twice → subtract once
```

But now the origin corner `P[d-1][r-1][c-1]`  has been added 3 times and
subtracted 3 times, leaving it at zero. It should appear exactly once. So add it
back:

```
+ P[d-1][r-1][c-1]       ← the origin corner, add back once
```

Putting it all together:

```
P[d][r][c] = cube[d][r][c]
           + P[d][r][c-1] + P[d][r-1][c] + P[d-1][r][c]
           - P[d][r-1][c-1] - P[d-1][r-1][c] - P[d-1][r][c-1]
           + P[d-1][r-1][c-1]
```

And here's exactly how that maps to the code:

```cpp
int termsToAdd      = cube[layer-1][row-1][col-1]
                    + P[layer][row][col-1]
                    + P[layer][row-1][col]
                    + P[layer-1][row][col];

int termsToSubtract = P[layer][row-1][col-1]
                    + P[layer-1][row-1][col]
                    + P[layer-1][row][col-1];

int offset          = P[layer-1][row-1][col-1];

P[layer][row][col]  = termsToAdd - termsToSubtract + offset;
```

### The Query Formula — 8-Corner Inclusion-Exclusion

Querying a subcube between `(backLayer, row1, col1)` and `(frontLayer, row2, col2)`
follows the same logic in reverse....you're basically reconstructing a bounded region from
the accumulated prefix cube using all 8 corners of that bounding box.

<img width="1567" height="1439" alt="IMG_8513C909C959-1" src="https://github.com/user-attachments/assets/5d0ce0c9-257f-4f8a-9d3f-7c55e3952a81" />


The formula I derived:

```
query = + P[f+1][r2+1][c2+1]        ← full cube up to front-bottom-right corner

        - P[f+1][r1][c2+1]          ← subtract top face
        - P[f+1][r2+1][c1]          ← subtract left face
        - P[b][r2+1][c2+1]          ← subtract back face

        + P[f+1][r1][c1]            ← add back top-left edge (subtracted twice)
        + P[b][r1][c2+1]            ← add back top-back edge (subtracted twice)  
        + P[b][r2+1][c1]            ← add back left-back edge (subtracted twice)

        - P[b][r1][c1]              ← subtract origin corner (added back 3 times)
```

Where `f = frontLayer`, `b = backLayer`.

Same pattern as the build....add the big region, subtract the three face slabs,
add back the three edges, subtract the origin corner. Inclusion-exclusion applied
to a rectangular prism.


### The `subCubesSumToTarget` Query — Collapsing 3D Into 1D

Just like 2D collapsed into 1D by fixing a row band and scanning columns, 3D
collapses into 1D by fixing *both* a layer band *and* a row band, then scanning
columns.

The loop structure:

```
for each (backLayer, frontLayer) pair:
    for each (rowTop, rowBot) pair:
        reset hashmap
        for each col:
            prefix = (P[front][bot][col] - P[back-1][bot][col])
                   - (P[front][top-1][col] - P[back-1][top-1][col])
            check if (prefix - k) exists in map
            store prefix in map
```

You're fixing two dimensions, reducing the search space to a 1D column scan. The exact same hashmap trick, applied one level deeper.

The complexity is O(D² · R² · C) which is quadratic over both the depth and row dimensions, linear over columns. 
Each new dimension you fix adds another nested pair of loops.

---

### What This Proved To Me

1D → 2D → 3D isn't three different algorithms. In reality, it's one idea applied at different scales. 
Fix all but one dimension. Reduce to 1D. Run the hashmap. Reset between search spaces.

Once you see that, the 3D version isn't harder conceptually. It's just more corners to track.

I hope you enjoyed the read, and thank you to whoever sees this and read this all the way through. You a real one!








