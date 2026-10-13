using System;
using System.Data;
using System.Data.SqlClient;
using System.Web.UI;
using LabTrack.Web.Data;

namespace LabTrack.Web
{
    public partial class SampleEntry : Page
    {
        private readonly ResultRepository _results = new ResultRepository();

        protected void Page_Load(object sender, EventArgs e)
        {
            // Current sample is kept in in-process session state between postbacks
            if (Session["CurrentSampleId"] == null)
            {
                Response.Redirect("SampleSearch.aspx");
            }
            lblSample.Text = Session["CurrentSampleId"].ToString();
        }

        protected void btnApprove_Click(object sender, EventArgs e)
        {
            var sampleId = (int)Session["CurrentSampleId"];
            var user = Context.User.Identity.Name;

            // 21 CFR Part 11: re-authenticate before applying the electronic signature
            if (!ElectronicSignature.Verify(user, txtSignaturePassword.Text))
            {
                return;
            }

            _results.ApproveResult(sampleId, decimal.Parse(txtResult.Text), user, "Approved after review");
        }
    }
}
