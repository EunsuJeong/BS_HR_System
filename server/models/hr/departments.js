const mongoose = require("mongoose");

const departmentSchema = new mongoose.Schema({
  department: String,
  subDepartments: [String],
  roles: [String],
}, { collection: 'departments' });

const Department = mongoose.model("Department", departmentSchema);
module.exports = Department;
