/**
 * Engine for the Prefix Sum Visualizer.
 * This class is responsible for building prefix sum structures for 1D, 2D, and 3D arrays,
 * as well as providing methods to query sums of subarrays, submatrices, and subcubes.
 * @author Aaron Sarkar
 * @version 1.0
 */

#include <iostream>
#include <vector>
#include <unordered_map>

using namespace std;

class PrefixSumMaster
{
public:
	/**
	 * 1D array constructor
	 */
	PrefixSumMaster(const vector<int> &array)
	{
		build1dPrefixArray(array);
	};

	/**
	 * 2D array constructor
	 */
	PrefixSumMaster(const vector<vector<int>> &matrix)
	{
		build2dPrefixMatrix(matrix);
	};

	/**
	 * 3D array constructor
	 */
	PrefixSumMaster(const vector<vector<vector<int>>> &cube)
	{
		build3dPrefixCube(cube);
	}

	/**
	 * Output contents of prefix array to console
	 */
	void printPrefixArray()
	{
		for (size_t i = 0; i < mPrefixArray.size(); i++)
		{
			cout << mPrefixArray[i] << " ";
		}
		cout << endl;
		cout << endl;
	}

	/**
	 * Output contents of prefix matrix to console
	 */
	void printPrefixMatrix()
	{

		size_t rows = mPrefixMatrix.size();
		size_t cols = mPrefixMatrix[0].size();

		for (size_t r = 0; r < rows; r++)
		{
			for (size_t c = 0; c < cols; c++)
			{
				cout << mPrefixMatrix[r][c] << " ";
			}
			cout << endl;
		}
		cout << endl;
	}

	/**
	 * Output contents of prefix cube to console
	 */
	void printPrefixCube()
	{
		size_t depth = mPrefixCube.size();
		size_t rows = mPrefixCube[0].size();
		size_t cols = mPrefixCube[0][0].size();

		for (size_t layer = 0; layer < depth; layer++)
		{
			for (size_t row = 0; row < rows; row++)
			{
				for (size_t col = 0; col < cols; col++)
				{
					cout << mPrefixCube[layer][row][col] << " ";
				}
				cout << endl;
			}
			cout << endl;
		}
		cout << endl;
	}

	/**
	 * Method that returns number of times a target sum is achieved by a subArray
	 */
	int subArraysSumToTarget(const vector<int> &array, int target) const
	{
		size_t count = 0;
		size_t cols = array.size();
		unordered_map<int, int> freq = {{0, 1}};
		int prefix = 0;
		for (size_t i = 0; i < cols; i++)
		{
			prefix += array[i];
			if (freq.find(prefix - target) != freq.end())
			{
				count += freq[prefix - target];
			}
			freq[prefix]++;
		}
		return count;
	}

	/**
	 * Method that returns number of times a target sum is achieved by a submatrix
	 */
	int subMatricesSumToTarget(const int target) const
	{
		size_t count = 0;
		size_t rows = mPrefixMatrix.size() - 1;
		size_t cols = mPrefixMatrix[0].size() - 1;

		for (size_t rowTop = 1; rowTop <= rows; rowTop++)
		{
			for (size_t rowBot = rowTop; rowBot <= rows; rowBot++)
			{
				unordered_map<int, int> freq = {{0, 1}};
				int prefix = 0;
				for (size_t col = 1; col <= cols; col++)
				{
					prefix = mPrefixMatrix[rowBot][col] - mPrefixMatrix[rowTop - 1][col];
					if (freq.find(prefix - target) != freq.end())
					{
						count += freq[prefix - target];
					}
					freq[prefix]++;
				}
			}
		}

		return count;
	}

	/**
	 * Method that returns number of times a target sum is achieved by a subcube
	 */
	int subCubesSumToTarget(const int target) const
	{
		size_t count = 0;
		const size_t depth = mPrefixCube.size() - 1;
		const size_t rows = mPrefixCube[0].size() - 1;
		const size_t cols = mPrefixCube[0][0].size() - 1;

		for (size_t backLayer = 1; backLayer <= depth; backLayer++)
		{
			for (size_t frontLayer = backLayer; frontLayer <= depth; frontLayer++)
			{
				for (size_t rowTop = 1; rowTop <= rows; rowTop++)
				{
					for (size_t rowBot = rowTop; rowBot <= rows; rowBot++)
					{
						unordered_map<int, int> freq = {{0, 1}};
						int prefix = 0;
						for (size_t col = 1; col <= cols; col++)
						{
							prefix = (mPrefixCube[frontLayer][rowBot][col] - mPrefixCube[backLayer - 1][rowBot][col]) - (mPrefixCube[frontLayer][rowTop - 1][col] - mPrefixCube[backLayer - 1][rowTop - 1][col]);
							if (freq.find(prefix - target) != freq.end())
							{
								count += freq[prefix - target];
							}
							freq[prefix]++;
						}
					}
				}
			}
		}
		return count;
	}

	/**
	 * Get the sum between any 2 pair of values in 1D array
	 */
	int queryArray(int left, int right) const
	{
		int sum = mPrefixArray[right + 1] - mPrefixArray[left];
		return sum;
	}

	/**
	 * Get the sum of values of any submatrix in a matrix
	 */
	int queryMatrix(int row1, int col1, int row2, int col2) const
	{
		int sum = (mPrefixMatrix[row2 + 1][col2 + 1] - mPrefixMatrix[row1][col2 + 1] - mPrefixMatrix[row2 + 1][col1]) + mPrefixMatrix[row1][col1];
		return sum;
	}

	/**
	 * Get the sum of values of any subcube in a cube
	 */
	int queryCube(int frontLayer, int backLayer, int row1, int row2, int col1, int col2) const
	{
		int sum = (mPrefixCube[frontLayer + 1][row2 + 1][col2 + 1] - mPrefixCube[frontLayer + 1][row1][col2 + 1] - mPrefixCube[frontLayer + 1][row2 + 1][col1]) - (mPrefixCube[backLayer][row2 + 1][col2 + 1] - mPrefixCube[backLayer][row1][col2 + 1] - mPrefixCube[backLayer][row2 + 1][col1]) + mPrefixCube[frontLayer + 1][row1][col1] - mPrefixCube[backLayer][row1][col1];
		return sum;
	}

	/**
	 * Read-only accessors below are purely for letting the visualizer inspect
	 * the already-computed prefix structures. They add no new math.
	 */
	int getPrefixArrayValue(int i) const
	{
		return mPrefixArray[i];
	}
	int getPrefixMatrixValue(int r, int c) const
	{
		return mPrefixMatrix[r][c];
	}
	int getPrefixCubeValue(int d, int r, int c) const
	{
		return mPrefixCube[d][r][c];
	}

	size_t getPrefixArraySize() const
	{
		return mPrefixArray.size();
	}
	size_t getPrefixMatrixRows() const
	{
		return mPrefixMatrix.size();
	}
	size_t getPrefixMatrixCols() const
	{
		return mPrefixMatrix.empty() ? 0 : mPrefixMatrix[0].size();
	}
	size_t getPrefixCubeDepth() const
	{
		return mPrefixCube.size();
	}
	size_t getPrefixCubeRows() const
	{
		return mPrefixCube.empty() ? 0 : mPrefixCube[0].size();
	}
	size_t getPrefixCubeCols() const
	{
		return (mPrefixCube.empty() || mPrefixCube[0].empty()) ? 0 : mPrefixCube[0][0].size();
	}

private:
	vector<int> mPrefixArray;
	vector<vector<int>> mPrefixMatrix;
	vector<vector<vector<int>>> mPrefixCube;

	/**
	 * Builds 1d Prefix Array
	 */
	void build1dPrefixArray(const vector<int> &array)
	{
		if (array.size() == 0)
		{
			return;
		}
		const size_t cols = array.size();
		mPrefixArray = vector<int>(cols + 1, 0);
		int prefix = 0;
		for (size_t i = 1; i <= array.size(); i++)
		{
			prefix += array[i - 1];
			mPrefixArray[i] += prefix;
		}
	}

	/**
	 * Builds 2d Prefix Matrix
	 */
	void build2dPrefixMatrix(const vector<vector<int>> &matrix)
	{
		if (matrix.size() == 0 || matrix[0].size() == 0)
		{
			return;
		}

		const size_t rows = matrix.size();
		const size_t cols = matrix[0].size();

		mPrefixMatrix = vector<vector<int>>(rows + 1, vector<int>(cols + 1, 0));

		for (size_t row = 1; row <= rows; row++)
		{
			for (size_t col = 1; col <= cols; col++)
			{
				mPrefixMatrix[row][col] = (matrix[row - 1][col - 1] + mPrefixMatrix[row - 1][col] + mPrefixMatrix[row][col - 1]) - mPrefixMatrix[row - 1][col - 1];
			}
		}
	}

	/**
	 * Builds 3d Cube
	 */
	void build3dPrefixCube(const vector<vector<vector<int>>> &cube)
	{
		if (cube.size() == 0 || cube[0].size() == 0 || cube[0][0].size() == 0)
		{
			return;
		}

		const size_t depth = cube.size();
		const size_t rows = cube[0].size();
		const size_t cols = cube[0][0].size();

		mPrefixCube = vector<vector<vector<int>>>(depth + 1, vector<vector<int>>(rows + 1, vector<int>(cols + 1, 0)));

		for (size_t layer = 1; layer <= depth; layer++)
		{
			for (size_t row = 1; row <= rows; row++)
			{
				for (size_t col = 1; col <= cols; col++)
				{
					int termsToAdd = cube[layer - 1][row - 1][col - 1] + mPrefixCube[layer][row][col - 1] + mPrefixCube[layer][row - 1][col] + mPrefixCube[layer - 1][row][col];
					int termsToSubtract = mPrefixCube[layer][row - 1][col - 1] + mPrefixCube[layer - 1][row - 1][col] + mPrefixCube[layer - 1][row][col - 1];
					int offset = mPrefixCube[layer - 1][row - 1][col - 1];
					mPrefixCube[layer][row][col] += termsToAdd - termsToSubtract + offset;
				}
			}
		}
	}
};

/**
 * Interface for PrefixSumMaster to help with testing and visualization
 */
extern "C"
{
	PrefixSumMaster *createFromArray(int *array, int length)
	{
		vector<int> vec(array, array + length);
		return new PrefixSumMaster(vec);
	}

	PrefixSumMaster *createFromMatrix(int *flatMatrix, int rows, int cols)
	{
		vector<vector<int>> matrix(rows, vector<int>(cols));
		for (int r = 0; r < rows; r++)
			for (int c = 0; c < cols; c++)
				matrix[r][c] = flatMatrix[r * cols + c];
		return new PrefixSumMaster(matrix);
	}

	PrefixSumMaster *createFromCube(int *flatCube, int depth, int rows, int cols)
	{
		vector<vector<vector<int>>> cube(depth, vector<vector<int>>(rows, vector<int>(cols)));
		for (int d = 0; d < depth; d++)
			for (int r = 0; r < rows; r++)
				for (int c = 0; c < cols; c++)
					cube[d][r][c] = flatCube[d * rows * cols + r * cols + c];
		return new PrefixSumMaster(cube);
	}

	int queryArray(PrefixSumMaster *obj, int left, int right)
	{
		return obj->queryArray(left, right);
	}

	int queryMatrix(PrefixSumMaster *obj, int r1, int c1, int r2, int c2)
	{
		return obj->queryMatrix(r1, c1, r2, c2);
	}

	int queryCube(PrefixSumMaster *obj, int l1, int l2, int r1, int r2, int c1, int c2)
	{
		return obj->queryCube(l1, l2, r1, r2, c1, c2);
	}

	int subArraysSum(PrefixSumMaster *obj, int *array, int length, int target)
	{
		vector<int> vec(array, array + length);
		return obj->subArraysSumToTarget(vec, target);
	}

	int subMatricesSum(PrefixSumMaster *obj, int target)
	{
		return obj->subMatricesSumToTarget(target);
	}

	int subCubesSum(PrefixSumMaster *obj, int target)
	{
		return obj->subCubesSumToTarget(target);
	}

	int getPrefixArrayValue(PrefixSumMaster *obj, int i)
	{
		return obj->getPrefixArrayValue(i);
	}

	int getPrefixMatrixValue(PrefixSumMaster *obj, int r, int c)
	{
		return obj->getPrefixMatrixValue(r, c);
	}

	int getPrefixCubeValue(PrefixSumMaster *obj, int d, int r, int c)
	{
		return obj->getPrefixCubeValue(d, r, c);
	}

	void destroyPrefixSumMaster(PrefixSumMaster *obj)
	{
		delete obj;
	}
}
