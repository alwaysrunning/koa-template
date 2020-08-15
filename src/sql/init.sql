-- 创建新表
-- CREATE DATABASE portal DEFAULT CHARACTER SET utf8 COLLATE utf8_general_ci;

-- 新增角色 --
INSERT INTO roles (id, name, roleDesc, code, created_at, updated_at) VALUES ('7e90d320-0427-11e9-b978-17fff26e4c26', '超级管理员', '超级管理员', '110000', now(), now());
INSERT INTO roles (id, name, roleDesc, code, created_at, updated_at) VALUES ('7e90d220-0427-11e9-b978-17fff26e4c26', '管理员', '管理员', '001100', now(), now());
INSERT INTO roles (id, name, roleDesc, code, created_at, updated_at) VALUES ('7e90d120-0427-11e9-b978-17fff26e4c26', '产品管理员', '产品管理员', '000011', now(), now());


-- 新增用户 --
INSERT INTO users (id, username, email, created_at, updated_at) VALUES ('073cf120-0428-11e9-8c43-a9e74e9b3bd4', 'shandl', 'shandl@asiainfo.com', now(), now());
INSERT INTO users (id, username, email, created_at, updated_at) VALUES ('073cf220-0428-11e9-8c43-a9e74e9b3bd4', 'hongyang', 'hongyang@asiainfo.com', now(), now());
INSERT INTO users (id, username, email, created_at, updated_at) VALUES ('073cf020-0428-11e9-8c43-a9e74e9b3bd4', 'hehz5', 'hehz5@asiainfo.com', now(), now());
INSERT INTO users (id, username, email, created_at, updated_at) VALUES ('073cx320-0428-11e9-8c43-a9e74e9b3bd4', 'zhouke', 'zhouke@asiainfo.com', now(), now());
INSERT INTO users (id, username, email, created_at, updated_at) VALUES ('073cx220-0428-11e9-8c43-a9e74e9b3bd4', 'liuhy13', 'liuhy13@asiainfo.com', now(), now());
INSERT INTO users (id, username, email, created_at, updated_at) VALUES ('073cx120-0428-11e9-8c43-a9e74e9b3bd4', 'zengmy', 'zengmy@asiainfo.com', now(), now());


-- 用户和角色建立关联管理 超级管理员 --
INSERT INTO user_roles (user_id, role_id, created_at, updated_at) VALUES ('073cf120-0428-11e9-8c43-a9e74e9b3bd4', '7e90d320-0427-11e9-b978-17fff26e4c26', now(), now());

-- 管理员 --
INSERT INTO user_roles (user_id, role_id, created_at, updated_at) VALUES ('073cf220-0428-11e9-8c43-a9e74e9b3bd4', '7e90d220-0427-11e9-b978-17fff26e4c26', now(), now());
INSERT INTO user_roles (user_id, role_id, created_at, updated_at) VALUES ('073cf020-0428-11e9-8c43-a9e74e9b3bd4', '7e90d220-0427-11e9-b978-17fff26e4c26', now(), now());

-- 产品管理员 --
INSERT INTO user_roles (user_id, role_id, created_at, updated_at) VALUES ('073cx220-0428-11e9-8c43-a9e74e9b3bd4', '7e90d120-0427-11e9-b978-17fff26e4c26', now(), now());
INSERT INTO user_roles (user_id, role_id, created_at, updated_at) VALUES ('073cx320-0428-11e9-8c43-a9e74e9b3bd4', '7e90d120-0427-11e9-b978-17fff26e4c26', now(), now());
INSERT INTO user_roles (user_id, role_id, created_at, updated_at) VALUES ('073cx120-0428-11e9-8c43-a9e74e9b3bd4', '7e90d120-0427-11e9-b978-17fff26e4c26', now(), now());

-- 一级菜单 --
INSERT INTO catalogs (id, catalog, level, created_at, updated_at) VALUES ('173cx120-0428-11e9-8c43-a9e74e9b3bd4', '日志', 1, now(), now());
INSERT INTO catalogs (id, catalog, level, created_at, updated_at) VALUES ('273cx120-0428-11e9-8c43-a9e74e9b3bd4', '管理', 2, now(), now());

-- 一级菜单和角色关联 -- 
INSERT INTO role_catalogs (role_id, catalog_id, created_at, updated_at) VALUES ('7e90d320-0427-11e9-b978-17fff26e4c26', '173cx120-0428-11e9-8c43-a9e74e9b3bd4', now(), now());
INSERT INTO role_catalogs (role_id, catalog_id, created_at, updated_at) VALUES ('7e90d320-0427-11e9-b978-17fff26e4c26', '273cx120-0428-11e9-8c43-a9e74e9b3bd4', now(), now());

INSERT INTO role_catalogs (role_id, catalog_id, created_at, updated_at) VALUES ('7e90d220-0427-11e9-b978-17fff26e4c26', '273cx120-0428-11e9-8c43-a9e74e9b3bd4', now(), now());

INSERT INTO role_catalogs (role_id, catalog_id, created_at, updated_at) VALUES ('7e90d120-0427-11e9-b978-17fff26e4c26', '273cx120-0428-11e9-8c43-a9e74e9b3bd4', now(), now());

-- 二级菜单 --
INSERT INTO menus (id, name, code, label, icon, level, created_at, updated_at, catalog_id) VALUES ('373cx120-0428-11e9-8c43-a9e74e9b3bd4', 'login-log', 'm002', '登录日志', '', 1, now(), now(), '173cx120-0428-11e9-8c43-a9e74e9b3bd4');
INSERT INTO menus (id, name, code, label, icon, level, created_at, updated_at, catalog_id) VALUES ('473cx120-0428-11e9-8c43-a9e74e9b3bd4', 'download-log', 'm003', '下载日志', '', 2, now(), now(), '173cx120-0428-11e9-8c43-a9e74e9b3bd4');

INSERT INTO menus (id, name, code, label, icon, level, created_at, updated_at, catalog_id) VALUES ('573cx120-0428-11e9-8c43-a9e74e9b3bd4', 'news', 'news', '重要新闻', 'aid-content-paste', 3, now(), now(), '273cx120-0428-11e9-8c43-a9e74e9b3bd4');
INSERT INTO menus (id, name, code, label, icon, level, created_at, updated_at, catalog_id) VALUES ('673cx120-0428-11e9-8c43-a9e74e9b3bd4', 'team', 'team', '团队管理', 'aid-people', 4, now(), now(), '273cx120-0428-11e9-8c43-a9e74e9b3bd4');
INSERT INTO menus (id, name, code, label, icon, level, created_at, updated_at, catalog_id) VALUES ('773cx120-0428-11e9-8c43-a9e74e9b3bd4', 'prod', 'prod', '产品管理', 'aid-cube-outline', 5, now(), now(), '273cx120-0428-11e9-8c43-a9e74e9b3bd4');
INSERT INTO menus (id, name, code, label, icon, level, created_at, updated_at, catalog_id) VALUES ('873cx120-0428-11e9-8c43-a9e74e9b3bd4', 'laboratory', 'laboratory', '实验室Lab+', 'aid-laboratory', 6, now(), now(), '273cx120-0428-11e9-8c43-a9e74e9b3bd4');
INSERT INTO menus (id, name, code, label, icon, level, created_at, updated_at, catalog_id) VALUES ('973cx120-0428-11e9-8c43-a9e74e9b3bd4', 'usermanager', 'usermanager', '用户管理', 'aid-usermanager', 7, now(), now(), '273cx120-0428-11e9-8c43-a9e74e9b3bd4');
INSERT INTO menus (id, name, code, label, icon, level, created_at, updated_at, catalog_id) VALUES ('x73cx120-0428-11e9-8c43-a9e74e9b3bd4', 'examine', 'examine', '产品审核', 'aid-examine', 8, now(), now(), '273cx120-0428-11e9-8c43-a9e74e9b3bd4');
INSERT INTO menus (id, name, code, label, icon, level, created_at, updated_at, catalog_id) VALUES ('x13cx120-0428-11e9-8c43-a9e74e9b3bd4', 'plans', 'plans', '规划方案管理', 'aid-cube-outline', 9, now(), now(), '273cx120-0428-11e9-8c43-a9e74e9b3bd4');
INSERT INTO menus (id, name, code, label, icon, level, created_at, updated_at, catalog_id) VALUES ('x23cx120-0428-11e9-8c43-a9e74e9b3bd4', 'planexamine', 'planexamine', '规划方案审核', 'aid-examine', 10, now(), now(), '273cx120-0428-11e9-8c43-a9e74e9b3bd4');
INSERT INTO menus (id, name, code, label, icon, level, created_at, updated_at, catalog_id) VALUES ('x33cx120-0428-11e9-8c43-a9e74e9b3bd4', 'teammembers', 'teammembers', '团队成员管理', 'aid-examine', 11, now(), now(), '273cx120-0428-11e9-8c43-a9e74e9b3bd4');

-- 二级菜单与角色相关 --
INSERT INTO role_menus (created_at, updated_at, role_id, menu_id) VALUES (now(), now(), '7e90d320-0427-11e9-b978-17fff26e4c26', '373cx120-0428-11e9-8c43-a9e74e9b3bd4');
INSERT INTO role_menus (created_at, updated_at, role_id, menu_id) VALUES (now(), now(), '7e90d320-0427-11e9-b978-17fff26e4c26', '473cx120-0428-11e9-8c43-a9e74e9b3bd4');

INSERT INTO role_menus (created_at, updated_at, role_id, menu_id) VALUES (now(), now(), '7e90d320-0427-11e9-b978-17fff26e4c26', '973cx120-0428-11e9-8c43-a9e74e9b3bd4');

INSERT INTO role_menus (created_at, updated_at, role_id, menu_id) VALUES (now(), now(), '7e90d220-0427-11e9-b978-17fff26e4c26', 'x73cx120-0428-11e9-8c43-a9e74e9b3bd4');
INSERT INTO role_menus (created_at, updated_at, role_id, menu_id) VALUES (now(), now(), '7e90d220-0427-11e9-b978-17fff26e4c26', 'x23cx120-0428-11e9-8c43-a9e74e9b3bd4');

INSERT INTO role_menus (created_at, updated_at, role_id, menu_id) VALUES (now(), now(), '7e90d120-0427-11e9-b978-17fff26e4c26', '573cx120-0428-11e9-8c43-a9e74e9b3bd4');
INSERT INTO role_menus (created_at, updated_at, role_id, menu_id) VALUES (now(), now(), '7e90d120-0427-11e9-b978-17fff26e4c26', '673cx120-0428-11e9-8c43-a9e74e9b3bd4');
INSERT INTO role_menus (created_at, updated_at, role_id, menu_id) VALUES (now(), now(), '7e90d120-0427-11e9-b978-17fff26e4c26', 'x33cx120-0428-11e9-8c43-a9e74e9b3bd4');

INSERT INTO role_menus (created_at, updated_at, role_id, menu_id) VALUES (now(), now(), '7e90d120-0427-11e9-b978-17fff26e4c26', '773cx120-0428-11e9-8c43-a9e74e9b3bd4');
INSERT INTO role_menus (created_at, updated_at, role_id, menu_id) VALUES (now(), now(), '7e90d120-0427-11e9-b978-17fff26e4c26', 'x13cx120-0428-11e9-8c43-a9e74e9b3bd4');

INSERT INTO role_menus (created_at, updated_at, role_id, menu_id) VALUES (now(), now(), '7e90d120-0427-11e9-b978-17fff26e4c26', '873cx120-0428-11e9-8c43-a9e74e9b3bd4');

-- 管理员可管理菜单
-- 7e90d220-0427-11e9-b978-17fff26e4c26
-- INSERT INTO role_catalogs (role_id, catalog_id, created_at, updated_at) VALUES ('7e90d320-0427-11e9-b978-17fff26e4c26', '273cx120-0428-11e9-8c43-a9e74e9b3bd4', now(), now());
INSERT INTO role_menus (created_at, updated_at, role_id, menu_id) VALUES (now(), now(), '7e90d320-0427-11e9-b978-17fff26e4c26', 'x73cx120-0428-11e9-8c43-a9e74e9b3bd4');
INSERT INTO role_menus (created_at, updated_at, role_id, menu_id) VALUES (now(), now(), '7e90d320-0427-11e9-b978-17fff26e4c26', 'x23cx120-0428-11e9-8c43-a9e74e9b3bd4');

-- 超级管理员可管理菜单
-- 7e90d320-0427-11e9-b978-17fff26e4c26
-- INSERT INTO role_catalogs (role_id, catalog_id, created_at, updated_at) VALUES ('7e90d220-0427-11e9-b978-17fff26e4c26', '173cx120-0428-11e9-8c43-a9e74e9b3bd4', now(), now());
-- INSERT INTO role_catalogs (role_id, catalog_id, created_at, updated_at) VALUES ('7e90d220-0427-11e9-b978-17fff26e4c26', '273cx120-0428-11e9-8c43-a9e74e9b3bd4', now(), now());
INSERT INTO role_menus (created_at, updated_at, role_id, menu_id) VALUES (now(), now(), '7e90d220-0427-11e9-b978-17fff26e4c26', '373cx120-0428-11e9-8c43-a9e74e9b3bd4');
INSERT INTO role_menus (created_at, updated_at, role_id, menu_id) VALUES (now(), now(), '7e90d220-0427-11e9-b978-17fff26e4c26', '473cx120-0428-11e9-8c43-a9e74e9b3bd4');
INSERT INTO role_menus (created_at, updated_at, role_id, menu_id) VALUES (now(), now(), '7e90d220-0427-11e9-b978-17fff26e4c26', '973cx120-0428-11e9-8c43-a9e74e9b3bd4');
