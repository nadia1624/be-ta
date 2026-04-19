const { sendResponse } = require('../../../helpers/response');

describe('Response Helper', () => {
  let res;

  beforeEach(() => {
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  test('should send a success response without data', () => {
    sendResponse(res, 200, true, 'Operation successful');

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Operation successful'
    });
  });

  test('should send a success response with data', () => {
    const data = { id: 1, name: 'Test' };
    sendResponse(res, 201, true, 'Created successfully', data);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Created successfully',
      data: data
    });
  });

  test('should send an error response', () => {
    sendResponse(res, 404, false, 'Not found');

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Not found'
    });
  });
});
