
const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

const Student = require("./models/Students");

const app = express();

// Middleware
app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Student API is running",
  });
});

// Validate MongoDB document IDs
function isValidId(id) {
  return mongoose.isObjectIdOrHexString(id);
}

// Check request body
function isValidBody(body) {
  return (
    body !== null &&
    typeof body === "object" &&
    !Array.isArray(body)
  );
}

// Allowed student fields
const allowedFields = [
  "fullName",
  "course",
  "yearLevel",
  "section",
];

// Validate student input
function validateStudent(body, isUpdate = false) {
  if (!isValidBody(body)) {
    return "Request body must be a JSON object";
  }

  const fields = Object.keys(body);

  if (fields.length === 0) {
    return "Request body cannot be empty";
  }

  const unknownFields = fields.filter(
    (field) => !allowedFields.includes(field)
  );

  if (unknownFields.length > 0) {
    return `Unknown field(s): ${unknownFields.join(", ")}`;
  }

  if (!isUpdate && (!body.fullName || !body.course ||
      body.yearLevel === undefined)) {
    return "fullName, course, and yearLevel are required";
  }

  if (
    body.fullName !== undefined &&
    (typeof body.fullName !== "string" ||
      body.fullName.trim() === "")
  ) {
    return "fullName must be a non-empty string";
  }

  if (
    body.course !== undefined &&
    (typeof body.course !== "string" ||
      body.course.trim() === "")
  ) {
    return "course must be a non-empty string";
  }

  if (
    body.section !== undefined &&
    typeof body.section !== "string"
  ) {
    return "section must be a string";
  }

  if (
    body.yearLevel !== undefined &&
    (typeof body.yearLevel !== "number" ||
      !Number.isInteger(body.yearLevel) ||
      body.yearLevel < 1 ||
      body.yearLevel > 4)
  ) {
    return "yearLevel must be an integer from 1 to 4";
  }

  return null;
}

// 1. GET all students
app.get("/api/students", async (req, res) => {
  try {
    const students = await Student.find();

    return res.status(200).json(students);
  } catch (error) {
    console.error("Get students error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

// 2. GET one student by ID
app.get("/api/students/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        message: "Invalid student ID",
      });
    }

    const student = await Student.findById(id);

    if (!student) {
      return res.status(404).json({
        message: "Student not found",
      });
    }

    return res.status(200).json(student);
  } catch (error) {
    console.error("Get student error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

// 3. POST create a student
app.post("/api/students", async (req, res) => {
  try {
    const validationError = validateStudent(req.body);

    if (validationError) {
      return res.status(400).json({
        message: validationError,
      });
    }

    const student = await Student.create(req.body);

    return res.status(201).json({
      message: "Student created successfully",
      student,
    });
  } catch (error) {
    if (
      error.name === "ValidationError" ||
      error.name === "CastError"
    ) {
      return res.status(400).json({
        message: error.message,
      });
    }

    console.error("Create student error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

// 4. PUT update a student
app.put("/api/students/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        message: "Invalid student ID",
      });
    }

    const validationError = validateStudent(
      req.body,
      true
    );

    if (validationError) {
      return res.status(400).json({
        message: validationError,
      });
    }

    const student = await Student.findByIdAndUpdate(
      id,
      { $set: req.body },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!student) {
      return res.status(404).json({
        message: "Student not found",
      });
    }

    return res.status(200).json({
      message: "Student updated successfully",
      student,
    });
  } catch (error) {
    if (
      error.name === "ValidationError" ||
      error.name === "CastError"
    ) {
      return res.status(400).json({
        message: error.message,
      });
    }

    console.error("Update student error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

// 5. DELETE a student
app.delete("/api/students/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        message: "Invalid student ID",
      });
    }

    const student = await Student.findByIdAndDelete(id);

    if (!student) {
      return res.status(404).json({
        message: "Student not found",
      });
    }

    return res.status(200).json({
      message: "Student deleted successfully",
      student,
    });
  } catch (error) {
    console.error("Delete student error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

// Handle invalid JSON request bodies
app.use((error, req, res, next) => {
  if (
    error instanceof SyntaxError &&
    error.status === 400 &&
    "body" in error
  ) {
    return res.status(400).json({
      message: "Invalid JSON request body",
    });
  }

  return next(error);
});

// Connect to MongoDB before starting the server
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected successfully!");

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error(
      "MongoDB connection failed:",
      error.message
    );
    process.exit(1);
  });
