const User = require("../models/User");

exports.getUserStatsFromDB = async () => {
  const totalUsers = await User.countDocuments();

  const activeUsers = await User.countDocuments({ isActive: true });

  const verifiedUsers = await User.countDocuments({ isEmailVerified: true });

  const studentCount = await User.countDocuments({ role: "student" });
  const teacherCount = await User.countDocuments({ role: "teacher" });
  const adminCount = await User.countDocuments({ role: "admin" });

  // Users grouped by department
  const usersByDepartment = await User.aggregate([
    { $group: { _id: "$department", count: { $sum: 1 } } }
  ]);

  // Users grouped by semester
  const usersBySemester = await User.aggregate([
    { $group: { _id: "$semester", count: { $sum: 1 } } }
  ]);

  return {
    totalUsers,
    activeUsers,
    verifiedUsers,
    roles: {
      students: studentCount,
      teachers: teacherCount,
      admins: adminCount
    },
    usersByDepartment,
    usersBySemester
  };
};
