package tech.autokit.database

import com.facebook.react.bridge.*
import kotlinx.coroutines.*
import java.util.Date
import java.util.UUID

class Module(
    reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
    private val db = Storage.getDatabase(reactContext)
    private val workflowDao = db.workflowDao()
    private val runDao = db.runDao()

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    override fun getName(): String = "DatabaseModule"

    @ReactMethod
    fun upsertWorkflow(
        id: String,
        name: String,
        json: String,
        status: String,
        promise: Promise,
    ) {
        scope.launch {
            try {
                val workflow = Workflow(
                    id = if (id.isEmpty()) UUID.randomUUID().toString() else id,
                    name = name,
                    json = json,
                    status = WorkflowStatus.valueOf(status.uppercase()),
                )
                workflowDao.upsert(workflow)
                promise.resolve(workflow.id)
            } catch (e: Exception) {
                promise.reject("ERR_UPSERT_WF", e)
            }
        }
    }

    @ReactMethod
    fun getWorkflowById(id: String, promise: Promise) {
        scope.launch {
            try {
                val wf = workflowDao.getById(id)
                if (wf != null) {
                    val map = Arguments.createMap().apply {
                        putString("id", wf.id)
                        putString("name", wf.name)
                        putString("json", wf.json)
                        putString("status", wf.status.name)
                    }
                    promise.resolve(map)
                } else {
                    promise.resolve(null)
                }
            } catch (e: Exception) {
                promise.reject("ERR_GET_WF", e)
            }
        }
    }

    @ReactMethod
    fun getAllWorkflows(promise: Promise) {
        scope.launch {
            try {
                val list = workflowDao.getAll()
                val array = Arguments.createArray()
                list.forEach { wf ->
                    val map = Arguments.createMap().apply {
                        putString("id", wf.id)
                        putString("name", wf.name)
                        putString("json", wf.json)
                        putString("status", wf.status.name)
                    }
                    array.pushMap(map)
                }
                promise.resolve(array)
            } catch (e: Exception) {
                promise.reject("ERR_GET_ALL_WF", e)
            }
        }
    }

    @ReactMethod
    fun getWorkflowCount(promise: Promise) {
        scope.launch {
            try {
                promise.resolve(workflowDao.getCount())
            } catch (e: Exception) {
                promise.reject("ERR_COUNT_WF", e)
            }
        }
    }

    @ReactMethod
    fun deleteWorkflow(id: String, promise: Promise) {
        scope.launch {
            try {
                workflowDao.deleteById(id)
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("ERR_DELETE_WF", e)
            }
        }
    }

    @ReactMethod
    fun generateUniqueWorkflowName(baseName: String, promise: Promise) {
        scope.launch {
            try {
                val existingNames = workflowDao.getAllNames()
                var counter = 1
                var uniqueName = baseName
                
                while (existingNames.contains(uniqueName)) {
                    uniqueName = "$baseName $counter"
                    counter++
                }
                
                promise.resolve(uniqueName)
            } catch (e: Exception) {
                promise.reject("ERR_GENERATE_NAME", e)
            }
        }
    }

    @ReactMethod
    fun upsertRun(
        id: String,
        workflow: String,
        status: String,
        log: String,
        startTime: Double,
        endTime: Double,
        promise: Promise,
    ) {
        scope.launch {
            try {
                val run = Run(
                    id = if (id.isEmpty()) UUID.randomUUID().toString() else id,
                    workflow = workflow,
                    start = if (startTime > 0) Date(startTime.toLong()) else Date(),
                    end = if (endTime > 0) Date(endTime.toLong()) else null,
                    status = RunStatus.valueOf(status.uppercase()),
                    log = log,
                )
                runDao.upsert(run)
                promise.resolve(run.id)
            } catch (e: Exception) {
                promise.reject("ERR_UPSERT_RUN", e)
            }
        }
    }

    @ReactMethod
    fun getRunById(id: String, promise: Promise) {
        scope.launch {
            try {
                val run = runDao.getById(id)
                if (run != null) {
                    val map = Arguments.createMap().apply {
                        putString("id", run.id)
                        putString("workflow", run.workflow)
                        putDouble("start", run.start.time.toDouble())
                        putDouble("end", run.end?.time?.toDouble() ?: 0.0)
                        putString("status", run.status.name)
                        putString("log", run.log)
                    }
                    promise.resolve(map)
                } else {
                    promise.resolve(null)
                }
            } catch (e: Exception) {
                promise.reject("ERR_GET_RUN", e)
            }
        }
    }

    @ReactMethod
    fun getAllRuns(promise: Promise) {
        scope.launch {
            try {
                val list = runDao.getAll()
                val array = Arguments.createArray()
                list.forEach { run ->
                    val map = Arguments.createMap().apply {
                        putString("id", run.id)
                        putString("workflow", run.workflow)
                        putDouble("start", run.start.time.toDouble())
                        putDouble("end", run.end?.time?.toDouble() ?: 0.0)
                        putString("status", run.status.name)
                        putString("log", run.log)
                    }
                    array.pushMap(map)
                }
                promise.resolve(array)
            } catch (e: Exception) {
                promise.reject("ERR_GET_RUNS", e)
            }
        }
    }

    @ReactMethod
    fun getRunCount(promise: Promise) {
        scope.launch {
            try {
                promise.resolve(runDao.getCount())
            } catch (e: Exception) {
                promise.reject("ERR_COUNT_RUN", e)
            }
        }
    }

    @ReactMethod
    fun deleteRun(id: String, promise: Promise) {
        scope.launch {
            try {
                runDao.deleteById(id)
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("ERR_DELETE_RUN", e)
            }
        }
    }

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        scope.cancel()
    }
}