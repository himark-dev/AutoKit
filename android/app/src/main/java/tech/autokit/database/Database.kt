package tech.autokit.database

import android.content.Context
import androidx.room.*
import java.util.Date
import java.util.UUID

//

enum class WorkflowStatus { ENABLED, DISABLED }

@Entity(tableName = "workflows")
data class Workflow(
    @PrimaryKey val id: String = UUID.randomUUID().toString(),
    val name: String,
    val json: String,
    val status: WorkflowStatus
)

enum class RunStatus { RUNNING, SUCCESS, ERROR }

@Entity(
    tableName = "runs",
    foreignKeys = [
        ForeignKey(
            entity = Workflow::class,
            parentColumns = ["id"],
            childColumns = ["workflow"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index("workflow")]
)
data class Run(
    @PrimaryKey val id: String = UUID.randomUUID().toString(),
    val workflow: String,
    val start: Date,
    val end: Date?,
    val status: RunStatus,
    val log: String
)

//

@Dao
interface WorkflowDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(workflow: Workflow)

    @Query("SELECT * FROM workflows WHERE id = :id")
    suspend fun getById(id: String): Workflow?

    @Query("SELECT * FROM workflows")
    suspend fun getAll(): List<Workflow>

    @Query("SELECT name FROM workflows")
    suspend fun getAllNames(): List<String>

    @Query("SELECT * FROM workflows WHERE status = 'ENABLED'")
    suspend fun getActive(): List<Workflow>

    @Query("SELECT COUNT(*) FROM workflows")
    suspend fun getCount(): Int

    @Query("SELECT COUNT(*) FROM workflows")
    fun getCountFlow(): kotlinx.coroutines.flow.Flow<Int>

    @Delete
    suspend fun delete(workflow: Workflow)

    @Query("DELETE FROM workflows WHERE id = :id")
    suspend fun deleteById(id: String)
}

@Dao
interface RunDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(run: Run)

    @Query("SELECT COUNT(*) FROM runs")
    suspend fun getCount(): Int

    @Query("SELECT COUNT(*) FROM runs")
    fun getCountFlow(): kotlinx.coroutines.flow.Flow<Int>

    @Query("SELECT * FROM runs WHERE id = :id")
    suspend fun getById(id: String): Run?

    @Query("SELECT * FROM runs")
    suspend fun getAll(): List<Run>

    @Delete
    suspend fun delete(run: Run)

    @Query("DELETE FROM runs WHERE id = :id")
    suspend fun deleteById(id: String)
}

//

class Converter {
    @TypeConverter
    fun fromTimestamp(value: Long?): Date? = value?.let { Date(it) }

    @TypeConverter
    fun dateToTimestamp(date: Date?): Long? = date?.time

    @TypeConverter
    fun fromWorkflowStatus(status: WorkflowStatus): String = status.name

    @TypeConverter
    fun toWorkflowStatus(value: String): WorkflowStatus = WorkflowStatus.valueOf(value)

    @TypeConverter
    fun fromRunStatus(status: RunStatus): String = status.name

    @TypeConverter
    fun toRunStatus(value: String): RunStatus = RunStatus.valueOf(value)
}

//

@Database(
    entities = [Workflow::class, Run::class],
    version = 2
)
@TypeConverters(Converter::class)
abstract class Storage : RoomDatabase() {

    abstract fun workflowDao(): WorkflowDao
    abstract fun runDao(): RunDao

    companion object {
        @Volatile
        private var INSTANCE: Storage? = null

        fun getDatabase(context: Context): Storage {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    Storage::class.java,
                    "autokit_db"
                )
                    .fallbackToDestructiveMigration()
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
