package com.meter.backend.util;

import com.meter.backend.entity.User;

public final class UserRoleUtil {

    private UserRoleUtil() {
    }

    public static boolean isAdmin(User user) {
        if (user == null || user.getRole() == null) {
            return false;
        }
        return "ADMIN".equalsIgnoreCase(user.getRole().trim());
    }
}
