import { makeRequest } from "../lib/utils/all";
import EnvironmentsView from "../views/EnvironmentsView";

export function checkGate(project_uuid) {
  return new Promise((resolve, reject) => {
    makeRequest("POST", `/catch/api-proxy/api/checks/gate/${project_uuid}`)
      .then((response) => {
        try {
          let json = JSON.parse(response);
          if (json.gate === "pass") {
            resolve();
          } else {
            reject({ reason: "gate-failed", data: json });
          }
        } catch (error) {
          console.error(error);
        }
      })
      .catch((error) => {
        reject({ reason: "request-failed", error: error });
      });
  });
}

export function requestBuild(project_uuid, gateData) {
  return new Promise((resolve, reject) => {
    let failResult = gateData.fail;
    let missingEnvironments = failResult.environment_uuids;
    let environmentsToBeBuilt = [];
    for (let x = 0; x < failResult.actions.length; x++) {
      if (failResult.actions[x] == "BUILD") {
        environmentsToBeBuilt.push(missingEnvironments[x]);
      }
    }

    if (environmentsToBeBuilt.length > 0) {
      orchest.confirm(
        "Build",
        `The following environment UUIDs haven't been built: [${environmentsToBeBuilt}]. Would you like to build them?`,
        () => {
          let environment_build_requests = [];

          for (let environmentUUID of environmentsToBeBuilt) {
            environment_build_requests.push({
              environment_uuid: environmentUUID,
              project_uuid: project_uuid,
            });
          }

          makeRequest("POST", "/catch/api-proxy/api/environment-builds", {
            type: "json",
            content: {
              environment_build_requests: environment_build_requests,
            },
          })
            .then((_) => {})
            .catch((error) => {
              console.log(error);
            });

          // show environments view
          orchest.loadView(EnvironmentsView, { project_uuid: project_uuid });

          resolve();
        },
        () => {
          reject();
        }
      );
    } else {
      resolve();
    }
  });
}

export class BackgroundTaskPoller {
  constructor() {
    this.END_STATUSES = ["SUCCESS", "FAILURE"];
    this.POLL_FREQUENCY = 3000;

    this.taskCallbacks = {};
    this.activeTasks = {};
  }

  startPollingBackgroundTask(taskUUID, onComplete) {
    // default to no-op callback
    if (!onComplete) {
      onComplete = () => {};
    }

    this.activeTasks[taskUUID] = true;
    this.taskCallbacks[taskUUID] = onComplete;
    this.executeDelayedRequest(taskUUID);
  }

  executeDelayedRequest(taskUUID) {
    setTimeout(() => {
      if (this.activeTasks[taskUUID]) {
        this.requestStatus(taskUUID);
      }
    }, this.POLL_FREQUENCY);
  }

  removeTask(taskUUID) {
    delete this.activeTasks[taskUUID];
  }

  removeAllTasks() {
    this.activeTasks = {};
  }

  requestStatus(taskUUID) {
    makeRequest("GET", `/async/background-tasks/${taskUUID}`).then(
      (response) => {
        try {
          let data = JSON.parse(response);
          if (this.END_STATUSES.indexOf(data.status) !== -1) {
            this.taskCallbacks[taskUUID](data);
            this.removeTask(taskUUID);
          } else {
            this.executeDelayedRequest(taskUUID);
          }
        } catch (error) {
          console.error(error);
        }
      }
    );
  }
}
