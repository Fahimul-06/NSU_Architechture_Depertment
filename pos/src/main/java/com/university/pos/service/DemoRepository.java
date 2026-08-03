package com.university.pos.service;

import com.university.pos.model.*;
import java.util.*;

public final class DemoRepository {
    private final List<Student> students = List.of(
            new Student("ARCH-DEMO-001", "Architecture Student One", "ARCH", "04A37C92B180"),
            new Student("ARCH-DEMO-002", "Architecture Student Two", "ARCH", "04CC55AA1020")
    );

    private final List<Department> departments = List.of(
            new Department("ARCH", "Department of Architecture, North South University")
    );

    private final List<Faculty> faculties = List.of(
            new Faculty("ARCH-FAC-001", "Architecture Faculty One", "Professor", "ARCH", "Architecture Faculty Office 1"),
            new Faculty("ARCH-FAC-002", "Architecture Faculty Two", "Associate Professor", "ARCH", "Architecture Faculty Office 2"),
            new Faculty("ARCH-FAC-003", "Architecture Faculty Three", "Assistant Professor", "ARCH", "Architecture Faculty Office 3")
    );

    private final List<ServiceType> services = List.of(
            new ServiceType("ARCH-SVC-001", "ARCH-FAC-001", "Design Studio Consultation", 30),
            new ServiceType("ARCH-SVC-002", "ARCH-FAC-001", "Thesis and Final Project Review", 40),
            new ServiceType("ARCH-SVC-003", "ARCH-FAC-002", "Academic Advising", 15),
            new ServiceType("ARCH-SVC-004", "ARCH-FAC-002", "Portfolio Review", 25),
            new ServiceType("ARCH-SVC-005", "ARCH-FAC-003", "Jury and Critique Discussion", 20)
    );

    public Optional<Student> findStudentByNfc(String uid) {
        String normalized = uid == null ? "" : uid.replaceAll("[^A-Fa-f0-9]", "").toUpperCase();
        return students.stream().filter(s -> s.nfcUid().equalsIgnoreCase(normalized)).findFirst();
    }

    public List<Department> departments() { return departments; }
    public List<Faculty> facultiesByDepartment(String code) {
        return faculties.stream().filter(f -> f.departmentCode().equals(code)).toList();
    }
    public List<ServiceType> servicesByFaculty(String facultyId) {
        return services.stream().filter(s -> s.facultyId().equals(facultyId)).toList();
    }
}
