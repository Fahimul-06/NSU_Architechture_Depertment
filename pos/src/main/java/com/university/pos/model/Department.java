package com.university.pos.model;

public record Department(String code, String name) {
    @Override public String toString() { return code + " - " + name; }
}
