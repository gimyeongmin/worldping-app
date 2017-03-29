'use strict';

System.register(['lodash', 'angular', '../config/dsUpgrade'], function (_export, _context) {
  "use strict";

  var _, angular, DatasourceUpgrader, _createClass, _defaultCheck, EndpointConfigCtrl;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function defaultCheck(checkType) {
    var check = _.cloneDeep(_defaultCheck);
    switch (checkType) {
      case "http":
        check.type = "http";
        check.settings = {
          timeout: 5,
          port: 80,
          path: "/",
          headers: "User-Agent: worldping-api\nAccept-Encoding: gzip\n",
          body: '',
          method: "GET",
          host: "",
          downloadLimit: ''
        };
        check.frequency = 120;
        break;
      case "https":
        check.type = "https";
        check.settings = {
          timeout: 5,
          port: 443,
          path: "/",
          headers: "User-Agent: worldping-api\nAccept-Encoding: gzip\n",
          body: '',
          method: "GET",
          host: "",
          validateCert: true,
          downloadLimit: ''
        };
        check.frequency = 120;
        break;
      case "ping":
        check.type = "ping";
        check.settings = {
          timeout: 5,
          hostname: ""
        };
        check.frequency = 60;
        break;
      case "dns":
        check.type = "dns";
        check.settings = {
          timeout: 5,
          name: "",
          port: 53,
          protocol: "udp",
          server: "",
          type: "A"
        };
        check.frequency = 120;
        break;
    }
    return check;
  }

  return {
    setters: [function (_lodash) {
      _ = _lodash.default;
    }, function (_angular) {
      angular = _angular.default;
    }, function (_configDsUpgrade) {
      DatasourceUpgrader = _configDsUpgrade.default;
    }],
    execute: function () {
      _createClass = function () {
        function defineProperties(target, props) {
          for (var i = 0; i < props.length; i++) {
            var descriptor = props[i];
            descriptor.enumerable = descriptor.enumerable || false;
            descriptor.configurable = true;
            if ("value" in descriptor) descriptor.writable = true;
            Object.defineProperty(target, descriptor.key, descriptor);
          }
        }

        return function (Constructor, protoProps, staticProps) {
          if (protoProps) defineProperties(Constructor.prototype, protoProps);
          if (staticProps) defineProperties(Constructor, staticProps);
          return Constructor;
        };
      }();

      _defaultCheck = {
        settings: {},
        healthSettings: {
          notifications: {},
          num_collectors: 3,
          steps: 3
        },
        route: {
          type: "byIds",
          config: {
            "ids": []
          }
        }
      };

      _export('EndpointConfigCtrl', EndpointConfigCtrl = function () {
        /** @ngInject */
        function EndpointConfigCtrl($scope, $injector, $rootScope, $location, $modal, $anchorScroll, $timeout, $window, $q, backendSrv, alertSrv, contextSrv) {
          var _this = this;

          _classCallCheck(this, EndpointConfigCtrl);

          var self = this;
          this.backendSrv = backendSrv;
          this.$location = $location;
          this.$timeout = $timeout;
          this.$q = $q;
          this.alertSrv = alertSrv;
          this.$window = $window;

          this.pageReady = false;
          this.showCreating = false;
          this.insufficientQuota = false;

          this.frequencyOpts = [];
          var freqOpt = [10, 30, 60, 120];
          _.forEach(freqOpt, function (f) {
            _this.frequencyOpts.push({ value: f, label: "Every " + f + "s" });
          });

          this.newEndpointName = "";
          this.checks = {};
          this.endpoint = {};
          this.probes = [];
          this.probesByTag = {};
          this.org = null;
          this.quotas = {};

          this.ignoreChanges = false;

          var promises = [];
          this.reset();
          if ("endpoint" in $location.search()) {
            promises.push(this.getEndpoint($location.search().endpoint));
            promises.push(this.getQuotas());
          } else {
            // make sure we have sufficient quota.
            promises.push(this.checkQuota());
            this.endpoint = { name: "" };
          }

          promises.push(this.getProbes());
          promises.push(this.getOrgDetails());

          $q.all(promises).then(function () {
            _this.pageReady = true;
            $timeout(function () {
              $anchorScroll();
            }, 0, false);
          }, function (err) {
            alertSrv.set("endpoint config init failed", err, 'error', 10000);
          });

          if ($location.search().check) {
            switch ($location.search().check) {
              case "ping":
                this.showPing = true;
                break;
              case "dns":
                this.showDNS = true;
                break;
              case "http":
                this.showHTTP = true;
                break;
              case "https":
                this.showHTTPS = true;
                break;
            }
          }

          $window.onbeforeunload = function () {
            if (self.ignoreChanges) {
              return;
            }
            if (self.changesPending()) {
              return "There are unsaved changes to this dashboard";
            }
          };

          $scope.$on('$locationChangeStart', function (event, next) {
            if (!self.ignoreChanges && self.changesPending()) {
              event.preventDefault();
              var baseLen = $location.absUrl().length - $location.url().length;
              console.log("next: ", next);
              console.log("baseLen: ", baseLen);
              var nextUrl = next.substring(baseLen);
              console.log("nexUrl: ", nextUrl);
              var modalScope = $scope.$new();
              modalScope.ignore = function () {
                self.ignoreChanges = true;
                $location.url(nextUrl);
                return;
              };

              modalScope.save = function () {
                self.savePending(nextUrl);
              };

              $rootScope.appEvent('show-modal', {
                src: 'public/app/partials/unsaved-changes.html',
                modalClass: 'confirm-modal',
                scope: modalScope
              });
            }
          });
          this.datasourceUpgrader = new DatasourceUpgrader(contextSrv, backendSrv, $q);
          this.datasourceUpgrader.upgrade();
        }

        _createClass(EndpointConfigCtrl, [{
          key: 'getEndpoint',
          value: function getEndpoint(idString) {
            var _this2 = this;

            var id = parseInt(idString);
            return this.backendSrv.get('api/plugin-proxy/raintank-worldping-app/api/v2/endpoints/' + id).then(function (resp) {
              if (resp.meta.code !== 200) {
                _this2.alertSrv.set("failed to get endpoint.", resp.meta.message, 'error', 10000);
                return _this2.$q.reject(resp.meta.message);
              }
              _this2.endpoint = resp.body;
              _this2.newEndpointName = _this2.endpoint.name;
              _.forEach(resp.body.checks, function (check) {
                _this2.checks[check.type] = _.cloneDeep(check);
              });
              var definedChecks = _.keys(_this2.checks);
              if (definedChecks.length < 4) {
                if (_.indexOf(definedChecks, "http") === -1) {
                  _this2.checks["http"] = defaultCheck("http");
                }
                if (_.indexOf(definedChecks, "https") === -1) {
                  _this2.checks["https"] = defaultCheck("https");
                }
                if (_.indexOf(definedChecks, "ping") === -1) {
                  _this2.checks["ping"] = defaultCheck("ping");
                }
                if (_.indexOf(definedChecks, "dns") === -1) {
                  _this2.checks["dns"] = defaultCheck("dns");
                }
              }
            });
          }
        }, {
          key: 'getQuotas',
          value: function getQuotas() {
            var _this3 = this;

            return this.backendSrv.get('api/plugin-proxy/raintank-worldping-app/api/v2/quotas').then(function (resp) {
              if (resp.meta.code !== 200) {
                _this3.alertSrv.set("failed to get quotas.", resp.meta.message, 'error', 10000);
                return _this3.$q.reject(resp.meta.message);
              }
              _.forEach(resp.body, function (q) {
                _this3.quotas[q.target] = q;
              });
              return _this3.quotas;
            });
          }
        }, {
          key: 'checkQuota',
          value: function checkQuota() {
            var _this4 = this;

            return this.getQuotas().then(function (quotas) {
              if (quotas.endpoint) {
                var q = quotas.endpoint;
                _this4.insufficientQuota = q.limit > 0 && q.used >= q.limit;
              }
              if (_this4.insufficientQuota) {
                return _this4.$q.reject("Endpoint quota reached.");
              }
              return true;
            });
          }
        }, {
          key: 'getProbes',
          value: function getProbes() {
            var _this5 = this;

            return this.backendSrv.get('api/plugin-proxy/raintank-worldping-app/api/v2/probes').then(function (resp) {
              if (resp.meta.code !== 200) {
                _this5.alertSrv.set("failed to get getProbes.", resp.meta.message, 'error', 10000);
                return _this5.$q.reject(resp.meta.message);
              }
              _this5.probes = resp.body;
              _.forEach(_this5.probes, function (probe) {
                _.forEach(probe.tags, function (t) {
                  if (!(t in _this5.probesByTag)) {
                    _this5.probesByTag[t] = [];
                  }
                  _this5.probesByTag[t].push(probe);
                });
              });
            });
          }
        }, {
          key: 'getOrgDetails',
          value: function getOrgDetails() {
            var _this6 = this;

            return this.backendSrv.get('api/plugin-proxy/raintank-worldping-app/api/grafana-net/profile/org').then(function (resp) {
              _this6.org = resp;
            }, function (resp) {
              _this6.alertSrv.set("failed to get Org Details", resp.statusText, 'error', 10000);
            });
          }
        }, {
          key: 'probeCount',
          value: function probeCount(check) {
            if (!check) {
              return 0;
            }
            return this.getProbesForCheck(check).length;
          }
        }, {
          key: 'getProbesForCheck',
          value: function getProbesForCheck(check) {
            if (check.route.type === "byIds") {
              return check.route.config.ids || [];
            }

            if (check.route.type === "byTags") {
              var probeList = {};
              _.forEach(this.probes, function (p) {
                _.forEach(check.route.config.tags, function (t) {
                  if (_.indexOf(p.tags, t) !== -1) {
                    probeList[p.id] = true;
                  }
                });
              });
              return _.keys(probeList);
            }

            this.alertSrv("check has unknown routing type.", "unknown route type.", "error", 5000);
            return [];
          }
        }, {
          key: 'totalChecks',
          value: function totalChecks(check) {
            var _this7 = this;

            if (check === undefined) {
              return _.reduce(this.checks, function (total, value) {
                if (!value.enabled) {
                  return total;
                }

                return total + _this7.totalChecks(value);
              }, 0);
            }

            var probeCount = this.probeCount(check);
            if (probeCount < 1 || check.frequency < 1) {
              return 0;
            }

            return 30.4375 * 24 * (3600 / check.frequency) * probeCount / 1000000;
          }
        }, {
          key: 'formatSize',
          value: function formatSize(size) {
            if (size > 1024 * 1024) {
              return (size / 1024 / 1024).toFixed(2) + ' MB';
            }
            if (size > 1024) {
              return (size / 1024).toFixed(2) + ' KB';
            }
            return size;
          }
        }, {
          key: 'requiresUpgrade',
          value: function requiresUpgrade() {
            if (!this.org) {
              return true;
            }

            if (this.org.wpPlan !== '' && this.org.wpPlan !== 'free' && this.org.wpPlan !== 'trial') {
              return false;
            }

            if (this.org.checksPerMonth / 1000000 + this.totalChecks() > 1) {
              return true;
            }

            return false;
          }
        }, {
          key: 'currentlyTrial',
          value: function currentlyTrial() {
            if (!this.org) {
              return false;
            }

            if (this.org.wpPlan !== 'trial') {
              return true;
            }

            return false;
          }
        }, {
          key: 'reset',
          value: function reset() {
            this.discovered = false;
            this.discoveryInProgress = false;
            this.discoveryError = false;
            this.showConfig = false;
            this.showCreating = false;
            this.endpoint = {};
            this.checks = {};
          }
        }, {
          key: 'cancel',
          value: function cancel() {
            this.reset();
            this.ignoreChanges = true;
            this.$window.history.back();
          }
        }, {
          key: 'remove',
          value: function remove(endpoint) {
            var _this8 = this;

            return this.backendSrv.delete('api/plugin-proxy/raintank-worldping-app/api/v2/endpoints/' + endpoint.id).then(function (resp) {
              if (resp.meta.code !== 200) {
                _this8.alertSrv.set("failed to delete endpoint.", resp.meta.message, 'error', 10000);
                return _this8.$q.reject(resp.meta.message);
              }
              _this8.$location.path('plugins/raintank-worldping-app/page/endpoints');
            });
          }
        }, {
          key: 'updateEndpoint',
          value: function updateEndpoint() {
            this.endpoint.name = this.newEndpointName;
            this.saveEndpoint();
          }
        }, {
          key: 'tagsUpdated',
          value: function tagsUpdated() {
            this.saveEndpoint();
          }
        }, {
          key: 'savePending',
          value: function savePending(nextUrl) {
            var _this9 = this;

            _.forEach(this.checks, function (check) {
              if (!check.id && check.enabled) {
                //add the check
                _this9.endpoint.checks.push(check);
                return;
              }
              for (var i = 0; i < _this9.endpoint.checks.length; i++) {
                if (_this9.endpoint.checks[i].id === check.id) {
                  _this9.endpoint.checks[i] = _.cloneDeep(check);
                }
              }
            });
            return this.saveEndpoint().then(function () {
              _this9.ignoreChanges = true;
              if (nextUrl) {
                _this9.$location.url(nextUrl);
              } else {
                _this9.$location.path("plugins/raintank-worldping-app/page/endpoints");
              }
            });
          }
        }, {
          key: 'saveEndpoint',
          value: function saveEndpoint() {
            var _this10 = this;

            return this.backendSrv.put('api/plugin-proxy/raintank-worldping-app/api/v2/endpoints', this.endpoint).then(function (resp) {
              if (resp.meta.code !== 200) {
                _this10.alertSrv.set("failed to update endpoint.", resp.meta.message, 'error', 10000);
                return _this10.$q.reject(resp.meta.message);
              }
              _this10.endpoint = resp.body;
            });
          }
        }, {
          key: 'updateCheck',
          value: function updateCheck(check) {
            var _this11 = this;

            if (check.enabled) {
              var numProbes = this.probeCount(check);
              if (numProbes < check.healthSettings.num_collector) {
                check.healthSettings.num_collectors = numProbes;
              }
              if (check.type === "http" || check.type === "https") {
                if (['PUT', 'POST', 'DELETE', 'PATCH'].indexOf(check.settings.method) < 0) {
                  check.settings.body = "";
                }
              }
            }
            if (check.id) {
              for (var i = 0; i < this.endpoint.checks.length; i++) {
                if (this.endpoint.checks[i].id === check.id) {
                  this.endpoint.checks[i] = _.cloneDeep(check);
                }
              }
            } else {
              this.endpoint.checks.push(check);
            }
            return this.saveEndpoint().then(function () {
              _this11.alertSrv.set(check.type + " check updated.", "", "success", 2000);
              _.forEach(_this11.endpoint.checks, function (c) {
                if (c.type === check.type) {
                  _this11.checks[check.type] = _.cloneDeep(c);
                }
              });
            });
          }
        }, {
          key: 'skipDiscovery',
          value: function skipDiscovery() {
            this.discoveryInProgress = false;
            this.showConfig = true;
            this.discoveryError = false;
          }
        }, {
          key: 'discover',
          value: function discover(endpoint) {
            var _this12 = this;

            if (!endpoint.name) {
              return;
            }
            this.discoveryInProgress = true;
            this.discoveryError = false;
            return this.backendSrv.get('api/plugin-proxy/raintank-worldping-app/api/v2/endpoints/discover', endpoint).then(function (resp) {
              if (resp.meta.code !== 200) {
                _this12.alertSrv.set("failed to update endpoint.", resp.meta.message, 'error', 10000);
                _this12.discoveryError = "Failed to discover endpoint.";
                return _this12.$q.reject(resp.meta.message);
              }
              _this12.endpoint = resp.body;
              _.forEach(_this12.endpoint.checks, function (check) {
                _this12.checks[check.type] = _.cloneDeep(check);
              });
              var definedChecks = _.keys(_this12.checks);
              if (definedChecks.length < 4) {
                if (_.indexOf(definedChecks, "http") === -1) {
                  _this12.checks["http"] = defaultCheck("http");
                }
                if (_.indexOf(definedChecks, "https") === -1) {
                  _this12.checks["https"] = defaultCheck("https");
                }
                if (_.indexOf(definedChecks, "ping") === -1) {
                  _this12.checks["ping"] = defaultCheck("ping");
                }
                if (_.indexOf(definedChecks, "dns") === -1) {
                  _this12.checks["dns"] = defaultCheck("dns");
                }
              }
              _this12.showConfig = true;
              _this12.discovered = true;
            }, function () {
              _this12.discoveryError = "Failed to discover endpoint.";
            }).finally(function () {
              _this12.discoveryInProgress = false;
            });
          }
        }, {
          key: 'addEndpoint',
          value: function addEndpoint() {
            var _this13 = this;

            var self = this;
            var delay = 120;
            var newChecks = [];
            _.forEach(this.checks, function (check) {
              if (check.enabled) {
                if (check.frequency < delay) {
                  delay = check.frequency;
                }
                var numProbes = _this13.probeCount(check);
                if (numProbes < 3) {
                  check.healthSettings.num_collectors = numProbes;
                }
                newChecks.push(check);
              }
            });
            this.endpoint.checks = newChecks;
            return this.backendSrv.post('api/plugin-proxy/raintank-worldping-app/api/v2/endpoints', this.endpoint).then(function (resp) {
              if (resp.meta.code !== 200) {
                _this13.alertSrv.set("failed to add endpoint.", resp.meta.message, 'error', 10000);
                return _this13.$q.reject(resp.meta.message);
              }
              _this13.endpoint.id = resp.body.id;
              _this13.endpoint.slug = resp.body.slug;
              _this13.ignoreChanges = true;
              _this13.alertSrv.set("endpoint added", '', 'success', 3000);
              _this13.showCreating = true;
              _this13.endpointReadyDelay = delay;
              _this13.endpointReady = false;
              _this13.$timeout(function () {
                self.endpointReady = true;
              }, delay * 1000);
            });
          }
        }, {
          key: 'changesPending',
          value: function changesPending() {
            var _this14 = this;

            var changes = false;
            var seenCheckTypes = {};

            //check if any existing checks have changed
            _.forEach(this.endpoint.checks, function (check) {
              seenCheckTypes[check.type] = true;
              if (!angular.equals(check, _this14.checks[check.type])) {
                changes = true;
              }
            });

            //check if any new checks added.
            _.forEach(this.checks, function (check) {
              if (!(check.type in seenCheckTypes) && "frequency" in check) {
                changes = true;
              }
            });

            return changes;
          }
        }, {
          key: 'gotoDashboard',
          value: function gotoDashboard(endpoint, type) {
            if (!type) {
              type = 'summary';
            }
            var search = {
              "var-collector": "All",
              "var-endpoint": this.endpoint.slug
            };
            switch (type) {
              case "summary":
                this.$location.path("/dashboard/db/worldping-endpoint-summary").search(search);
                break;
              case "ping":
                this.$location.path("/dashboard/db/worldping-endpoint-ping").search(search);
                break;
              case "dns":
                this.$location.path("/dashboard/db/worldping-endpoint-dns").search(search);
                break;
              case "http":
                search['var-protocol'] = "http";
                this.$location.path("/dashboard/db/worldping-endpoint-web").search(search);
                break;
              case "https":
                search['var-protocol'] = "https";
                this.$location.path("/dashboard/db/worldping-endpoint-web").search(search);
                break;
              default:
                this.$location.path("/dashboard/db/worldping-endpoint-summary").search(search);
                break;
            }
          }
        }]);

        return EndpointConfigCtrl;
      }());

      EndpointConfigCtrl.templateUrl = 'public/plugins/raintank-worldping-app/components/endpoint/partials/endpoint_config.html';

      _export('EndpointConfigCtrl', EndpointConfigCtrl);
    }
  };
});
//# sourceMappingURL=endpoint_config.js.map
