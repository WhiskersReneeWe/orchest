import React, { Fragment } from "react";
import MDCButtonReact from "../lib/mdc-components/MDCButtonReact";
import { Controlled as CodeMirror } from "react-codemirror2";
import MDCTextFieldReact from "../lib/mdc-components/MDCTextFieldReact";
import MDCSelectReact from "../lib/mdc-components/MDCSelectReact";
import MDCCheckboxReact from "../lib/mdc-components/MDCCheckboxReact";
import {
  makeRequest,
  PromiseManager,
  makeCancelable,
  RefManager,
  LANGUAGE_MAP,
  DEFAULT_BASE_IMAGES,
} from "../lib/utils/all";
import EnvironmentsView from "./EnvironmentsView";
import { XTerm } from "xterm-for-react";
import { FitAddon } from "xterm-addon-fit";

import io from "socket.io-client";
import MDCDialogReact from "../lib/mdc-components/MDCDialogReact";

require("codemirror/mode/shell/shell");

class EnvironmentEditView extends React.Component {
  componentWillUnmount() {
    if (this.socket) {
      this.socket.close();
      console.log("SocketIO with namespace /environment_builds disconnected.");
    }

    this.promiseManager.cancelCancelablePromises();

    clearInterval(this.environmentBuildInterval);
  }

  constructor(props) {
    super(props);

    this.BUILD_POLL_FREQUENCY = 3000;
    this.END_STATUSES = ["SUCCESS", "FAILURE", "ABORTED"];
    this.CANCELABLE_STATUSES = ["PENDING", "STARTED"];

    this.state = {
      baseImages:
        props.environment &&
        DEFAULT_BASE_IMAGES.indexOf(props.environment.base_image) == -1
          ? DEFAULT_BASE_IMAGES.concat(props.environment.base_image)
          : DEFAULT_BASE_IMAGES.slice(),
      newEnvironment: props.environment === undefined,
      showingBuildLogs: true,
      ignoreIncomingLogs: false,
      unsavedChanges: false,
      building: false,
      environment: props.environment
        ? props.environment
        : {
            uuid: "new",
            name: "",
            gpu_support: false,
            project_uuid: this.props.project_uuid,
            base_image: "",
            language: "python",
            startup_script: `#!/bin/bash

# Install any dependencies you have in this shell script.

# E.g. pip install tensorflow


`,
          },
      environmentBuild: undefined,
    };

    this.state.gpuDocsNotice = this.state.environment.gpu_support;

    this.promiseManager = new PromiseManager();
    this.refManager = new RefManager();

    // initialize Xterm addons
    this.fitAddon = new FitAddon();
  }

  componentDidMount() {
    this.connectSocketIO();
    this.fitTerminal();
    this.environmentBuildPolling();
  }

  componentDidUpdate() {
    this.fitTerminal();
  }

  fitTerminal() {
    if (this.refManager.refs.term && this.state.showingBuildLogs) {
      this.fitAddon.fit();
    }
  }

  updateBuildStatus(environmentBuild) {
    if (this.CANCELABLE_STATUSES.indexOf(environmentBuild.status) !== -1) {
      this.setState({
        building: true,
      });
    } else {
      this.setState({
        building: false,
      });
    }
  }

  updateEnvironmentBuildState(environmentBuild) {
    this.updateBuildStatus(environmentBuild);
    this.setState({
      environmentBuild: environmentBuild,
    });
  }

  environmentBuildRequest() {
    let environmentBuildRequestPromise = makeCancelable(
      makeRequest(
        "GET",
        `/catch/api-proxy/api/environment-builds/most-recent/${this.state.environment.project_uuid}/${this.state.environment.uuid}`
      ),
      this.promiseManager
    );

    environmentBuildRequestPromise.promise
      .then((response) => {
        let environmentBuild = JSON.parse(response);
        this.updateEnvironmentBuildState(environmentBuild);
      })
      .catch((error) => {
        console.log(error);
      });
  }

  environmentBuildPolling() {
    this.environmentBuildRequest();
    clearInterval(this.environmentBuildInterval);
    this.environmentBuildInterval = setInterval(
      this.environmentBuildRequest.bind(this),
      this.BUILD_POLL_FREQUENCY
    );
  }

  connectSocketIO() {
    // disable polling
    this.socket = io.connect("/environment_builds", {
      transports: ["websocket"],
    });

    this.socket.on("connect", () => {
      console.log("SocketIO connected on /environment_builds");
    });

    this.socket.on("sio_streamed_task_data", (data) => {
      // ignore terminal outputs from other environment_uuids
      if (
        data.identity ==
        this.state.environment.project_uuid + "-" + this.state.environment.uuid
      ) {
        if (
          data["action"] == "sio_streamed_task_output" &&
          !this.state.ignoreIncomingLogs
        ) {
          let lines = data.output.split("\n");
          for (let x = 0; x < lines.length; x++) {
            if (x == lines.length - 1 && lines[x].length == 0) {
              continue;
            }
            this.refManager.refs.term.terminal.writeln(lines[x]);
          }
        } else if (data["action"] == "sio_streamed_task_started") {
          // This blocking mechanism makes sure old build logs are
          // not displayed after the user has started a build
          // during an ongoing build.
          this.setState({
            ignoreIncomingLogs: false,
          });
        }
      }
    });
  }

  build(e) {
    e.nativeEvent.preventDefault();

    this.setState({
      building: true,
    });

    if (this.refManager.refs.term) {
      this.refManager.refs.term.terminal.clear();

      this.setState({
        ignoreIncomingLogs: true,
      });
    }

    this.savePromise().then(() => {
      makeRequest("POST", "/catch/api-proxy/api/environment-builds", {
        type: "json",
        content: {
          environment_build_requests: [
            {
              environment_uuid: this.state.environment.uuid,
              project_uuid: this.state.environment.project_uuid,
            },
          ],
        },
      })
        .then((response) => {
          try {
            let environmentBuild = JSON.parse(response)[
              "environment_builds"
            ][0];
            this.updateEnvironmentBuildState(environmentBuild);
          } catch (error) {
            console.error(error);
          }
        })
        .catch((error) => {
          console.log(error);
        });
    });
  }

  savePromise() {
    // Saving an environment will invalidate the Jupyter <iframe>
    // TODO: perhaps this can be fixed with coordination between JLab +
    // Enterprise Gateway team.
    orchest.jupyter.unload();

    return makeCancelable(
      new Promise((resolve, reject) => {
        let method = "POST";
        let endpoint = `/store/environments/${this.state.environment.project_uuid}/${this.state.environment.uuid}`;

        if (this.state.newEnvironment === false) {
          method = "PUT";
        }

        makeRequest(method, endpoint, {
          type: "json",
          content: {
            environment: this.state.environment,
          },
        })
          .then((response) => {
            let result = JSON.parse(response);

            this.state.environment.uuid = result.uuid;

            this.setState({
              environment: this.state.environment,
              newEnvironment: false,
              unsavedChanges: false,
            });

            resolve();
          })
          .catch((error) => {
            console.log(error);

            try {
              console.error(JSON.parse(error.body)["message"]);
            } catch (error) {
              console.log(error);
              console.log("Couldn't get error message from response.");
            }

            reject();
          });
      }),
      this.promiseManager
    ).promise;
  }

  onSave(e) {
    e.preventDefault();
    this.savePromise();
  }

  returnToEnvironments() {
    orchest.loadView(EnvironmentsView, {
      project_uuid: this.props.project_uuid,
    });
  }

  toggleBuildLog(e) {
    e.preventDefault();

    this.setState((state, props) => {
      return { showingBuildLogs: !state.showingBuildLogs };
    });
  }

  onChangeName(value) {
    this.state.environment.name = value;
    this.setState({
      unsavedChanges: true,
      environment: this.state.environment,
    });
  }

  onChangeBaseImage(value) {
    this.state.environment.base_image = value;
    this.setState({
      unsavedChanges: true,
      environment: this.state.environment,
    });
  }

  onChangeLanguage(value) {
    this.state.environment.language = value;
    this.setState({
      unsavedChanges: true,
      environment: this.state.environment,
    });
  }

  onGPUChange(is_checked) {
    this.state.environment.gpu_support = is_checked;
    this.setState({
      unsavedChanges: true,
      gpuDocsNotice: is_checked,
    });
  }

  onCancelAddCustomBaseImageDialog() {
    this.setState({
      addCustomBaseImageDialog: undefined,
    });
  }

  submitAddCustomBaseImage() {
    let customBaseImageName = this.refManager.refs.customBaseImageTextField.mdc
      .value;

    this.state.environment.base_image = customBaseImageName;

    this.setState((state, _) => {
      return {
        baseImages:
          state.baseImages.indexOf(customBaseImageName) == -1
            ? state.baseImages.concat(customBaseImageName)
            : state.baseImages,
        environment: this.state.environment,
        unsavedChanges: true,
        addCustomBaseImageDialog: undefined,
      };
    });
  }

  onAddCustomBaseImage() {
    this.setState({
      addCustomBaseImageDialog: (
        <MDCDialogReact
          title="Add custom base image"
          onClose={this.onCancelAddCustomBaseImageDialog.bind(this)}
          content={
            <div>
              <MDCTextFieldReact
                label="Base image name"
                ref={this.refManager.nrefs.customBaseImageTextField}
              />
            </div>
          }
          actions={
            <Fragment>
              <MDCButtonReact
                label="Add"
                icon="check"
                classNames={["mdc-button--raised"]}
                onClick={this.submitAddCustomBaseImage.bind(this)}
              />
              <MDCButtonReact
                label="Cancel"
                onClick={this.onCancelAddCustomBaseImageDialog.bind(this)}
              />
            </Fragment>
          }
        />
      ),
    });
  }

  cancelBuild() {
    // send DELETE to cancel ongoing build
    if (
      this.state.environmentBuild &&
      this.CANCELABLE_STATUSES.indexOf(this.state.environmentBuild.status) !==
        -1
    ) {
      makeRequest(
        "DELETE",
        `/catch/api-proxy/api/environment-builds/${this.state.environmentBuild.build_uuid}`
      )
        .then(() => {
          // immediately fetch latest status
          // NOTE: this DELETE call doesn't actually destroy the resource, that's
          // why we're querying it again.
          this.environmentBuildRequest();
        })
        .catch((error) => {
          console.error(error);
        });

      this.setState({
        building: false,
      });
    } else {
      orchest.alert(
        "Could not cancel build, please try again in a few seconds."
      );
    }
  }

  render() {
    return (
      <div className={"view-page edit-environment"}>
        {(() => {
          if (this.state.addCustomBaseImageDialog) {
            return this.state.addCustomBaseImageDialog;
          }
        })()}

        <h2>Edit environment</h2>

        {(() => {
          if (this.state.environment.uuid !== "new") {
            return (
              <span className="environment-uuid">
                {this.state.environment.uuid}
              </span>
            );
          }
        })()}

        <MDCTextFieldReact
          classNames={["fullwidth", "push-down"]}
          label="Environment name"
          onChange={this.onChangeName.bind(this)}
          value={this.state.environment.name}
        />

        <MDCSelectReact
          value="python"
          label="Language"
          classNames={["fullwidth", "push-down"]}
          ref={this.refManager.nrefs.environmentLanguage}
          onChange={this.onChangeLanguage.bind(this)}
          options={[
            ["python", LANGUAGE_MAP["python"]],
            ["r", LANGUAGE_MAP["r"]],
          ]}
          value={this.state.environment.language}
        />

        <MDCCheckboxReact
          onChange={this.onGPUChange.bind(this)}
          label="GPU support"
          classNames={["push-down"]}
          value={this.state.environment.gpu_support}
          ref={this.refManager.nrefs.environmentGPUSupport}
        />

        {(() => {
          if (this.state.gpuDocsNotice === true) {
            return (
              <div className="docs-notice push-down">
                Check out{" "}
                <a
                  target="_blank"
                  href={
                    orchest.config["DOCS_ROOT"] + "/en/latest/installation.html"
                  }
                >
                  the documentation
                </a>{" "}
                to make sure Orchest is properly configured for images with GPU
                support.
              </div>
            );
          }
        })()}

        <div className="select-button-columns">
          <MDCSelectReact
            ref={this.refManager.nrefs.environmentName}
            classNames={["fullwidth", "push-down"]}
            label="Base image"
            onChange={this.onChangeBaseImage.bind(this)}
            value={this.state.environment.base_image}
            options={this.state.baseImages.map((el) => [el])}
          />
          <MDCButtonReact
            icon="add"
            label="Custom image"
            onClick={this.onAddCustomBaseImage.bind(this)}
          />
          <div className="clear"></div>
        </div>

        <CodeMirror
          value={this.state.environment.startup_script}
          options={{
            mode: "application/x-sh",
            theme: "default",
            lineNumbers: true,
            viewportMargin: Infinity,
          }}
          onBeforeChange={(editor, data, value) => {
            this.state.environment.startup_script = value;

            this.setState({
              environment: this.state.environment,
              unsavedChanges: true,
            });
          }}
        />

        <div>
          <MDCButtonReact
            classNames={["mdc-button--raised", "push-up"]}
            onClick={this.toggleBuildLog.bind(this)}
            label="Toggle build log"
            icon="subject"
          />

          <div
            className={
              "push-up " + (this.state.showingBuildLogs ? "" : "hidden")
            }
          >
            <XTerm addons={[this.fitAddon]} ref={this.refManager.nrefs.term} />

            {(() => {
              if (this.state.environmentBuild) {
                return (
                  <div className="build-status push-up">
                    <div>
                      Build status: {this.state.environmentBuild.status}
                    </div>
                    <div>
                      Build started:{" "}
                      {this.state.environmentBuild.started_time ? (
                        new Date(
                          this.state.environmentBuild.started_time + " GMT"
                        ).toLocaleString()
                      ) : (
                        <i>not yet started</i>
                      )}
                    </div>
                    <div>
                      Build finished:{" "}
                      {this.state.environmentBuild.finished_time ? (
                        new Date(
                          this.state.environmentBuild.finished_time + " GMT"
                        ).toLocaleString()
                      ) : (
                        <i>not yet finished</i>
                      )}
                    </div>
                  </div>
                );
              }
            })()}
          </div>
        </div>

        <div className="multi-button push-up push-down">
          <MDCButtonReact
            classNames={["mdc-button--raised", "themed-secondary"]}
            onClick={this.onSave.bind(this)}
            label={this.state.unsavedChanges ? "Save*" : "Save"}
            icon="save"
          />
          {(() => {
            if (!this.state.building) {
              return (
                <MDCButtonReact
                  classNames={["mdc-button--raised"]}
                  onClick={this.build.bind(this)}
                  label="Build"
                  icon="memory"
                />
              );
            } else {
              return (
                <MDCButtonReact
                  classNames={["mdc-button--raised"]}
                  onClick={this.cancelBuild.bind(this)}
                  label="Cancel build"
                  icon="memory"
                />
              );
            }
          })()}
        </div>
        <MDCButtonReact
          label="Back to environments"
          icon="arrow_back"
          onClick={this.returnToEnvironments.bind(this)}
        />
      </div>
    );
  }
}

export default EnvironmentEditView;
