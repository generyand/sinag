import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AssessmentDetailPage({ params }: PageProps) {
  const { id } = await params;
  // Mock data - replace with actual API call using id
  const assessment = {
    id: id,
    title: "Q1 2024 Leadership Assessment",
    description:
      "Comprehensive leadership evaluation focusing on strategic decision-making, team management, and organizational vision.",
    status: "completed",
    completedDate: "2024-03-15",
    score: 85,
    categories: [
      { name: "Strategic Leadership", score: 88, maxScore: 100 },
      { name: "Team Management", score: 82, maxScore: 100 },
      { name: "Communication", score: 90, maxScore: 100 },
      { name: "Decision Making", score: 80, maxScore: 100 },
    ],
    feedback: [
      {
        category: "Strategic Leadership",
        feedback:
          "Demonstrates strong strategic thinking and vision. Areas for improvement include long-term planning execution.",
      },
      {
        category: "Team Management",
        feedback:
          "Excellent team building skills. Consider focusing on delegation and empowerment strategies.",
      },
    ],
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-400";
    if (score >= 60) return "bg-yellow-400";
    return "bg-red-400";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link
          href="/assessments"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Assessments
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{assessment.title}</h1>
              <p className="mt-1 text-sm text-gray-500">{assessment.description}</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">{assessment.score}%</div>
                <div className="text-sm text-gray-500">Overall Compliance Rate</div>
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                Completed
              </span>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Score Breakdown */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Compliance Rate Breakdown</h3>
              <div className="space-y-4">
                {assessment.categories.map((category) => (
                  <div key={category.name} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">{category.name}</span>
                        <span className="text-sm text-gray-500">
                          {category.score}/{category.maxScore}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${getScoreColor(category.score)}`}
                          style={{ width: `${(category.score / category.maxScore) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Assessment Info */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Assessment Information</h3>
              <dl className="grid grid-cols-1 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="mt-1 text-sm text-gray-900 capitalize">{assessment.status}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Completion Date</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {assessment.completedDate
                      ? new Date(assessment.completedDate).toLocaleDateString()
                      : "Not completed"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Assessment ID</dt>
                  <dd className="mt-1 text-sm text-gray-900">{assessment.id}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Feedback */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Detailed Feedback</h2>
        </div>
        <div className="p-6">
          <div className="space-y-6">
            {assessment.feedback.map((item, index) => (
              <div key={index} className="border-l-4 border-blue-400 pl-4">
                <h4 className="text-sm font-medium text-gray-900">{item.category}</h4>
                <p className="mt-1 text-sm text-gray-600">{item.feedback}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex space-x-4">
        <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
          Download Report
        </button>
        <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
          Retake Assessment
        </button>
      </div>
    </div>
  );
}
