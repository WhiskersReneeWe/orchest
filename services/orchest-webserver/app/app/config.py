import os
import logging

from _orchest.internals import config as _config


class Config:
    DEBUG = False
    TESTING = False

    SQLALCHEMY_DATABASE_URI = "sqlite:////userdir/.orchest/orchest-webserver.db"
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    dir_path = os.path.dirname(os.path.realpath(__file__))

    USER_DIR = os.path.join("/userdir")
    HOST_USER_DIR = os.environ.get("HOST_USER_DIR")
    WEBSERVER_LOGS = _config.WEBSERVER_LOGS
    DOCS_ROOT = _config.DOCS_ROOT
    STATIC_DIR = os.path.join(dir_path, "..", "static")

    DEFAULT_ENVIRONMENTS = _config.DEFAULT_ENVIRONMENTS
    DEFAULT_DATASOURCES = _config.DEFAULT_DATASOURCES
    ORCHEST_API_ADDRESS = _config.ORCHEST_API_ADDRESS

    FLASK_ENV = os.environ.get("FLASK_ENV", "PRODUCTION")

    DEBUG = True

    TELEMETRY_INTERVAL = 15  # in minutes

    if DEBUG:
        logging.basicConfig(level=logging.INFO)

    RESOURCE_DIR = os.path.join(dir_path, "res")


class DevelopmentConfig(Config):
    DEBUG = True


class TestingConfig(Config):
    # This config is used by the tests.
    TESTING = True


# ---- CONFIGURATIONS ----
# Production
# CONFIG_CLASS = Config

# Development
CONFIG_CLASS = DevelopmentConfig
