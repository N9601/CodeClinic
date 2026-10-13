using System.Configuration;
using System.Data;
using System.Data.SqlClient;

namespace LabTrack.Web.Data
{
    public class ResultRepository
    {
        private static readonly string ConnectionString =
            ConfigurationManager.ConnectionStrings["LabTrackDb"].ConnectionString;

        public void ApproveResult(int sampleId, decimal value, string user, string reason)
        {
            using (var conn = new SqlConnection(ConnectionString))
            using (var cmd = new SqlCommand("dbo.usp_ApproveResult", conn))
            {
                cmd.CommandType = CommandType.StoredProcedure;
                cmd.Parameters.AddWithValue("@SampleId", sampleId);
                cmd.Parameters.AddWithValue("@ResultValue", value);
                cmd.Parameters.AddWithValue("@ApprovedBy", user);
                cmd.Parameters.AddWithValue("@Reason", reason);
                conn.Open();
                cmd.ExecuteNonQuery(); // spec check, OOS flag and audit trail all happen inside the procedure
            }
        }
    }
}
